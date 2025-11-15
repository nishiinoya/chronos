import { useMemo, useState } from 'react';
import {
    addMonths, subMonths, startOfMonth, endOfMonth, format,
    startOfWeek, addWeeks, subWeeks, startOfDay, endOfDay,
    addDays, subDays, isWithinInterval, parseISO
} from 'date-fns';

import CalendarHeader from '../ui/CalendarHeader.jsx';
import SidebarCalendars from '../ui/SidebarCalendars.jsx';
import CalendarMonth from '../ui/CalendarMonth.jsx';
import CalendarWeek from '../ui/CalendarWeek.jsx';
import CalendarDay from '../ui/CalendarDay.jsx';
import EventModal from '../ui/modals/EventModal.jsx';

import useCalendars from '../state/useCalendars.js';
import useEvents from '../state/useEvents.js';

// Holidays system calendar (read-only, local-only)
import { useHolidays } from '../system/holidays';

export default function CalendarPage()
{
    const [cursor, setCursor] = useState(new Date());
    const [view, setView] = useState('month');
    const [selectedDay, setSelectedDay] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [showHolidays, setShowHolidays] = useState(true);


    const range = useMemo(() =>
    {
        if (view === 'week')
        {
            const s = startOfWeek(cursor, { weekStartsOn: 1 });
            const e = addDays(s, 6);
            return { start: s, end: endOfDay(e) };
        }
        if (view === 'day') return { start: startOfDay(cursor), end: endOfDay(cursor) };
        return { start: startOfMonth(cursor), end: endOfMonth(cursor) };
    }, [cursor, view]);

    const { calendars, activeId, selectCalendar, createCalendar, updateCalendar, deleteCalendar } = useCalendars();

    // Holidays calendar & events (system)
    const { calendar: holidaysCal, events: holidayEvents } = useHolidays();


    const { events: backendEvents, refresh } = useEvents({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        calendarIds: activeId ? [activeId] : [],
    });



    // Filter holiday events to current visible range (their start/end are YYYY-MM-DD all-day)
    const holidayEventsInRange = useMemo(() => 
    {
        return holidayEvents.filter(h => 
        {
            const d = parseISO(h.start); // YYYY-MM-DD -> Date at 00:00
            return isWithinInterval(d, { start: startOfDay(range.start), end: endOfDay(range.end) });
        });
    }, [holidayEvents, range.start, range.end]);

    const events = useMemo(() => 
    {
    // filter holiday events by visible range
        const holidayEventsInRange = holidayEvents.filter(h => 
        {
            const d = parseISO(h.start); // YYYY-MM-DD -> Date at 00:00
            return isWithinInterval(d, {
                start: startOfDay(range.start),
                end: endOfDay(range.end),
            });
        });

        const base = activeId ? backendEvents : [];
        if (!showHolidays) return base;

        const merged = [...base, ...holidayEventsInRange];
        const map = new Map();
        merged.forEach(e => e?.id && map.set(e.id, e));
        return Array.from(map.values());
    }, [backendEvents, holidayEvents, range.start, range.end, activeId, showHolidays]);



    // Merge calendars so UI knows Holidays exists (color, label, etc.)
    const mergedCalendars = useMemo(() => 
    {
        return [holidaysCal, ...calendars.filter(c => c.id !== holidaysCal.id)];
    }, [calendars, holidaysCal]);

    const headerTitle = useMemo(() =>
        format(cursor,
            view === 'day'  ? 'EEE, MMM d yyyy' :
                view === 'week' ? "'Week of' MMM d, yyyy" :
                    'MMMM yyyy'
        ), [cursor, view]);

    function goPrev()
    {
        setCursor((d) => view === 'day' ? subDays(d,1) : view === 'week' ? subWeeks(d,1) : subMonths(d,1));
    }
    function goNext()
    {
        setCursor((d) => view === 'day' ? addDays(d,1) : view === 'week' ? addWeeks(d,1) : addMonths(d,1));
    }

    // Guard: block opening edit modal for holiday (read-only) events
    const isHolidayEvent = (evt) => evt?.calendarId === holidaysCal.id || evt?.locked === true;

    return (
        <div className="layout">
            <SidebarCalendars
                calendars={calendars}              // only real calendars; Sidebar adds holidays itself
                activeCalendarId={activeId}
                onSelectCalendar={selectCalendar}
                showHolidays={showHolidays}
                onToggleHolidays={setShowHolidays}
                onCreate={createCalendar}
                onUpdate={updateCalendar}
                onDelete={deleteCalendar}
            />


            <main className="main">
                <CalendarHeader
                    title={headerTitle}
                    view={view}
                    onChangeView={setView}
                    onPrev={goPrev}
                    onNext={goNext}
                    onToday={() => setCursor(new Date())}
                />

                {view === 'month' && (
                    <CalendarMonth
                        cursor={cursor}
                        events={events}
                        calendars={mergedCalendars}
                        onDayClick={(d) => 
                        {
                            setSelectedDay(d); setEditingEvent(null); 
                        }}
                        onEventClick={(evt) => 
                        {
                            if (isHolidayEvent(evt)) return; // read-only
                            setEditingEvent(evt); setSelectedDay(null);
                        }}
                    />
                )}

                {view === 'week' && (
                    <CalendarWeek
                        cursor={cursor}
                        events={events}
                        calendars={mergedCalendars}
                        onSlotDoubleClick={(d)=> 
                        {
                            setSelectedDay(d); setEditingEvent(null); 
                        }}
                        onEventClick={(evt)=> 
                        {
                            if (isHolidayEvent(evt)) return; // read-only
                            setEditingEvent(evt); setSelectedDay(null);
                        }}
                    />
                )}

                {view === 'day' && (
                    <CalendarDay
                        cursor={cursor}
                        events={events}
                        calendars={mergedCalendars}
                        onSlotDoubleClick={(d)=> 
                        {
                            setSelectedDay(d); setEditingEvent(null); 
                        }}
                        onEventClick={(evt)=> 
                        {
                            if (isHolidayEvent(evt)) return; // read-only
                            setEditingEvent(evt); setSelectedDay(null);
                        }}
                    />
                )}
            </main>

            {(selectedDay || editingEvent) && (
                <EventModal
                    key={editingEvent ? editingEvent.id : selectedDay?.toISOString()}
                    date={selectedDay}
                    event={editingEvent}
                    calendars={mergedCalendars}
                    activeCalendarId={activeId} 
                    onClose={() => 
                    {
                        setSelectedDay(null); setEditingEvent(null); 
                    }}
                    onSaved={() => 
                    {
                        setSelectedDay(null); setEditingEvent(null); refresh(); 
                    }}
                    onDeleted={() => 
                    {
                        setEditingEvent(null); refresh(); 
                    }}
                />
            )}
        </div>
    );
}
