import { useMemo, useRef, useEffect, useState } from 'react';
import {
    addDays, startOfWeek, format, setHours, setMinutes,
    isSameDay, startOfDay, endOfDay, differenceInMinutes, max, min
} from 'date-fns';

function toDate(d) 
{
    return d instanceof Date ? d : new Date(d); 
}
const HOURS = Array.from({ length: 24 }, (_, h) => h);

function hexToRgba(hex, a=0.18)
{
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#6c6cff');
    const r = parseInt(m?.[1]||'6c',16), g = parseInt(m?.[2]||'6c',16), b = parseInt(m?.[3]||'ff',16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Proper overlap grouping: items go into the same group if they OVERLAP any member */
function layoutDay(events, dayStart, dayEnd, pxPerMinute) 
{
    const slices = events.map(ev => 
    {
        const isHoliday = ev.calendarId === 'system_holidays' || ev.source === 'holidays';
        const s0 = toDate(ev.start);
        const e0 = toDate(ev.end ?? ev.start);

        const s = max([s0, dayStart]);
        const e = min([e0, dayEnd]);
        if (e <= s) return null;
        return { ev, start: s, end: e };
    }).filter(Boolean).sort((a,b)=> a.start - b.start || b.end - a.end);

    // Build groups of overlapping intervals
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

    // Column assignment within each overlap group
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
                const height = Math.max(1, differenceInMinutes(it.end, it.start)) * pxPerMinute;
                positioned.push({ event: it.ev, top, height, leftPct, widthPct });
            }
        });
    }
    return positioned;
}

export default function CalendarWeek({ cursor, events, calendars, onSlotDoubleClick, onEventClick }) 
{
    const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
    const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const calById = useMemo(() => Object.fromEntries(calendars.map(c => [c.id, c])), [calendars]);

    // Measure one .hour to sync slot height
    const hourRef = useRef(null);
    const [hourHeight, setHourHeight] = useState(60);
    const pxPerMinute = hourHeight / 60;
    useEffect(() => 
    {
        const h = hourRef.current?.offsetHeight;
        if (h && h > 0) setHourHeight(h);
    }, []);

    const positionedByDay = useMemo(() => 
    {
        const map = new Map();
        for (const d of days) 
        {
            const ds = startOfDay(d), de = endOfDay(d);
            const dayEvents = events.filter(ev => 
            {
                const s = toDate(ev.start), e = toDate(ev.end ?? ev.start);
                return e > ds && s < de;
            });
            map.set(+ds, layoutDay(dayEvents, ds, de, pxPerMinute));
        }
        return map;
    }, [days, events, pxPerMinute]);

    const allDayByDay = useMemo(() => 
    {
        const map = new Map();
        for (const d of days) 
        {
            const ds = startOfDay(d), de = endOfDay(d);
            map.set(+ds, events.filter(ev =>
                ev.allDay &&
        (toDate(ev.end ?? ev.start) > ds && toDate(ev.start) < de)
            ));
        }
        return map;
    }, [days, events]);

    return (
        <div className="week-wrap">
            <div className="week-header">
                <div className="wh-cell time-col"></div>
                {days.map(d => (
                    <div key={d.toISOString()} className={`wh-cell ${isSameDay(d, new Date()) ? 'today' : ''}`}>
                        {format(d, 'EEE d MMM')}
                    </div>
                ))}
            </div>

            <div className="week-body">
                <div className="time-col">
                    {HOURS.map((h, i) => (
                        <div key={h} ref={i === 0 ? hourRef : null} className="hour">
                            {`${String(h).padStart(2,'0')}:00`}
                        </div>
                    ))}
                </div>

                {days.map((d) => 
                {
                    const key = +startOfDay(d);
                    const positioned = positionedByDay.get(key) || [];
                    const allDay = allDayByDay.get(key) || [];
                    return (
                        <div key={d.toISOString()} className="day-col" style={{ position: 'relative' }}>
                            {HOURS.map((h) => 
                            {
                                const slot = setMinutes(setHours(d, h), 0);
                                return (
                                    <div
                                        key={h}
                                        className="slot"
                                        style={{ height: hourHeight }}
                                        onDoubleClick={() => onSlotDoubleClick?.(slot)}
                                        onClick={() => onSlotDoubleClick?.(slot)}
                                    />
                                );
                            })}

                            <div className="overlay-events" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
                                {positioned.map(p => 
                                {
                                    const color = calById[p.event.calendarId]?.color || '#6c6cff';
                                    console.log(p.event);
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
                                            <div style={{ fontSize: 12, fontWeight: 600, lineHeight: '14px' }}>{p.event.title}</div>
                                            <div style={{ fontSize: 11, opacity: 0.8 }}>
                                                {format(toDate(p.event.start),'HH:mm')}–{format(toDate(p.event.end ?? p.event.start),'HH:mm')}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
