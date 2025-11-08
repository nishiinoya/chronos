import { useMemo, useEffect, useRef, useState } from 'react';
import {
    format, startOfDay, endOfDay, differenceInMinutes, max, min,
    setHours, setMinutes
} from 'date-fns';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

// Helpers
function toDate(d) 
{
    return d instanceof Date ? d : new Date(d); 
}
function hexToRgba(hex, a = 0.18) 
{
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#6c6cff');
    const r = parseInt(m?.[1] || '6c', 16);
    const g = parseInt(m?.[2] || '6c', 16);
    const b = parseInt(m?.[3] || 'ff', 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Layout timed events for a single day.
 * - Holidays (calendarId === 'system_holidays' or source === 'holidays') are rendered as full-day timed blocks.
 * - Non-holiday all-day events are excluded here (shown in header strip).
 * - Overlaps are split into columns.
 */
function layoutDay(events, dayStart, dayEnd, pxPerMinute) 
{
    const slices = events
        .map(ev => 
        {
            const isHoliday = ev.calendarId === 'system_holidays' || ev.source === 'holidays';
            const s0 = toDate(ev.start);
            const e0 = toDate(ev.end ?? ev.start);

            // Non-holiday all-day stays in the header strip; holidays render in the grid.
            if (ev.allDay && !isHoliday) return null;

            const s = max([s0, dayStart]);
            const e = min([e0, dayEnd]);
            if (e <= s) return null;

            return { ev, start: s, end: e };
        })
        .filter(Boolean)
        .sort((a, b) => a.start - b.start || b.end - a.end);

    // Build groups of overlapping intervals (interval graph)
    const groups = [];
    for (const it of slices) 
    {
        let placed = false;
        for (const g of groups) 
        {
            const overlapsGroup = g.some(x => !(it.end <= x.start || it.start >= x.end));
            if (overlapsGroup) 
            {
                g.push(it); placed = true; break; 
            }
        }
        if (!placed) groups.push([it]);
    }

    // Assign columns within each overlap group
    const positioned = [];
    for (const g of groups) 
    {
        const columns = [];
        for (const it of g) 
        {
            let idx = 0;
            while (true) 
            {
                const col = columns[idx] || (columns[idx] = []);
                const collides = col.some(x => !(it.end <= x.start || it.start >= x.end));
                if (!collides) 
                {
                    col.push(it); break; 
                }
                idx++;
            }
        }
        const colCount = columns.length;
        columns.forEach((col, idx) => 
        {
            const leftPct = (idx / colCount) * 100;
            const widthPct = 100 / colCount;
            for (const it of col) 
            {
                const top = Math.max(0, differenceInMinutes(it.start, dayStart)) * pxPerMinute;
                const height = Math.max(1, differenceInMinutes(it.end, it.start) * pxPerMinute);
                positioned.push({ event: it.ev, top, height, leftPct, widthPct });
            }
        });
    }
    return positioned;
}

export default function CalendarDay({
    cursor,              // Date of the day being shown
    events = [],
    calendars = [],
    onSlotDoubleClick,   // (date) => void  (used for single-click too)
    onEventClick,        // (event) => void
}) 
{
    const dayStart = startOfDay(cursor);
    const dayEnd = endOfDay(cursor);

    // calendar colors lookup
    const calById = useMemo(() => Object.fromEntries(calendars.map(c => [c.id, c])), [calendars]);

    // Measure the left time column .hour height to sync the grid
    const hourRef = useRef(null);
    const [hourHeight, setHourHeight] = useState(60);
    const pxPerMinute = hourHeight / 60;
    useEffect(() => 
    {
        const h = hourRef.current?.offsetHeight;
        if (h && h > 0) setHourHeight(h);
    }, []);

    // Events intersecting the day (multi-day support)
    const dayEvents = useMemo(
        () => events.filter(ev => toDate(ev.end ?? ev.start) > dayStart && toDate(ev.start) < dayEnd),
        [events, dayStart, dayEnd]
    );

    // Non-holiday all-day events for the header strip
    const allDayEvents = useMemo(
        () => dayEvents.filter(e => e.allDay && e.calendarId !== 'system_holidays'),
        [dayEvents]
    );

    // Positioned timed events (includes holidays as full-day blocks)
    const positioned = useMemo(
        () => layoutDay(dayEvents, dayStart, dayEnd, pxPerMinute),
        [dayEvents, dayStart, dayEnd, pxPerMinute]
    );

    return (
        <div className="day-wrap">
            <div className="day-header">{format(cursor, 'EEEE, d MMMM yyyy')}</div>

            <div className="day-body">
                {/* Time labels column (reuse week styles) */}
                <div className="time-col">
                    {HOURS.map((h, i) => (
                        <div key={h} ref={i === 0 ? hourRef : null} className="hour">
                            {`${String(h).padStart(2, '0')}:00`}
                        </div>
                    ))}
                </div>

                {/* Single day column */}
                <div className="day-col" style={{ position: 'relative' }}>
                    {/* Clickable slots with enforced height matching the time column */}
                    {HOURS.map((h) => 
                    {
                        const slot = setMinutes(setHours(cursor, h), 0);
                        return (
                            <div
                                key={h}
                                className="slot"
                                style={{ height: hourHeight }}
                                onDoubleClick={() => onSlotDoubleClick?.(slot)}
                                onClick={() => onSlotDoubleClick?.(slot)}   // single-click create
                            />
                        );
                    })}


                    {/* Timed events layer (includes holidays as 00:00→24:00 full-day blocks) */}
                    <div
                        className="overlay-events"
                        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
                    >
                        {positioned.map(p => 
                        {
                            const color = calById[p.event.calendarId]?.color || '#6c6cff';
                            return (
                                <div
                                    key={p.event.id}
                                    onClick={() => onEventClick?.(p.event)}
                                    title={p.event.title}
                                    style={{
                                        position: 'absolute',
                                        top: p.top,
                                        left: `${p.leftPct}%`,
                                        width: `${p.widthPct}%`,
                                        height: p.height,
                                        padding: 4,
                                        boxSizing: 'border-box',
                                        borderRadius: 6,
                                        background: hexToRgba(color, 0.18),
                                        border: `1px solid ${color}`,
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        pointerEvents: 'auto',
                                    }}
                                >
                                    <div style={{ fontSize: 12, fontWeight: 600, lineHeight: '14px' }}>
                                        {p.event.title}
                                    </div>
                                    <div style={{ fontSize: 11, opacity: 0.8 }}>
                                        {format(toDate(p.event.start), 'HH:mm')}–{format(toDate(p.event.end ?? p.event.start), 'HH:mm')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
