import { addDays, isSameDay, isSameMonth, format, startOfWeek, startOfDay } from 'date-fns';
import EventPill from './EventPill.jsx';

function toDate(d)
{
    return d instanceof Date ? d : new Date(d); 
}

export default function CalendarMonth({ cursor, events, calendars, onDayClick, onEventClick }) 
{
    const monthStartDow = startOfWeek(new Date(cursor.getFullYear(), cursor.getMonth(), 1), { weekStartsOn: 1 });
    const days = Array.from({ length: 42 }, (_, i) => addDays(monthStartDow, i));
    const calById = Object.fromEntries(calendars.map(c => [c.id, c]));

    const bucket = {};
    if (events?.length) 
    {
        const gridStart = startOfDay(days[0]);
        const gridEnd = startOfDay(addDays(days[0], 42));
        for (const evt of events) 
        {
            const s0 = toDate(evt.start);
            const e0 = toDate(evt.end ?? evt.start);
            const s = s0 < gridStart ? gridStart : s0;
            const e = e0 > gridEnd ? gridEnd : e0;

            // Walk each day touched by [s, e) — end exclusive
            let pushedAny = false;
            for (let d = startOfDay(s); d < e; d = addDays(d, 1)) 
            {
                const key = format(d, 'yyyy-MM-dd');
                const arr = (bucket[key] ||= []);
                if (!arr.some(x => x.id === evt.id)) arr.push(evt);  // ← de-dupe per day
                pushedAny = true;
            }
            // Instant events (no span) appear on start day once
            if (!pushedAny) 
            {
                const key = format(startOfDay(s0), 'yyyy-MM-dd');
                const arr = (bucket[key] ||= []);
                if (!arr.some(x => x.id === evt.id)) arr.push(evt);
            }
        }
    }

    return (
        <div className="month-grid">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
                <div key={d} className="dow">{d}</div>
            ))}
            {days.map((d) => 
            {
                const key = format(d, 'yyyy-MM-dd');
                const todaysEvents = bucket[key] || [];
                const faded = !isSameMonth(d, cursor);
                const today = isSameDay(d, new Date());
                return (
                    <div key={key} className={`cell ${faded ? 'faded' : ''} ${today ? 'today' : ''}`} onDoubleClick={() => onDayClick?.(d)}>
                        <div className="cell-top">
                            <span className="date-num">{format(d, 'd')}</span>
                        </div>
                        <div className="events">
                            {todaysEvents.map((evt) => (
                                <EventPill
                                    key={`${evt.id}-${key}`}
                                    type={evt.type}
                                    title={evt.title}
                                    color={calById[evt.calendarId]?.color || '#6c6cff'}
                                    time={
                                        evt.allDay || evt.calendarId === 'system_holidays'
                                            ? '' // holidays/all-day: no start time dot
                                            : (isSameDay(toDate(evt.start), d) ? format(toDate(evt.start), 'p') : '')
                                    }
                                    onClick={() => onEventClick?.(evt)}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
