// frontend/src/ui/modals/EventModal.jsx
import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api/client.js';

export default function EventModal({ date, event, calendars, activeCalendarId, onClose, onSaved, onDeleted }) 
{
    const [form, setForm] = useState(() => 
    {
        if (event) 
        {
            return {
                title: event.title,
                start: toLocalInput(event.start),
                end: toLocalInput(event.end ?? event.start),
                calendarId: event.calendarId,
                location: event.location || '',
                description: event.description || '',
                type: event.type || 'task',
            };
        }

        const start = date ? new Date(date) : new Date();
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        // choose default calendar for NEW event
        let defaultCalendarId = '';

        if (activeCalendarId) 
        {
            const active = calendars.find(c => c.id === activeCalendarId && !c.isSystem);
            if (active) defaultCalendarId = active.id;
        }
        if (!defaultCalendarId) 
        {
            const nonSystem = calendars.find(c => !c.isSystem);
            if (nonSystem) defaultCalendarId = nonSystem.id;
        }
        if (!defaultCalendarId) 
        {
            defaultCalendarId = calendars[0]?.id || '';
        }

        return {
            title: '',
            start: formatLocal(start),
            end: formatLocal(end),
            calendarId: defaultCalendarId,
            location: '',
            description: '',
            type: 'task',
        };
    });

    const [busy, setBusy] = useState(false);

    const currentCalendar = useMemo(
        () => calendars.find(c => c.id === form.calendarId),
        [calendars, form.calendarId]
    );
    const currentRole = currentCalendar?.myRole || null;

    const canEdit = useMemo(() => 
    {
        if (!currentRole) return true; // fallback for old data
        return (
            currentRole === 'owner' ||
            currentRole === 'admin' ||
            currentRole === 'editor'
        );
    }, [currentRole]);

    const canSave = canEdit && form.title && form.start && form.calendarId;

    useEffect(() => 
    {
        const h = (e) => 
        {
            if (e.key === 'Escape') onClose?.(); 
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    // ensure end matches start for non-arrangement types
    useEffect(() => 
    {
        if (form.type === 'arrangement') return;
        // for reminder and task we keep end equal to start for consistency
        if (form.start && form.end !== form.start) 
        {
            setForm(prev => ({ ...prev, end: prev.start }));
        }
    }, [form.type, form.start, form.end]);

    async function save() 
    {
        if (!canSave) return;
        setBusy(true);

        const payload = {
            ...form,
            start: new Date(form.start).toISOString(),
            end: new Date(form.end || form.start).toISOString(),
        };

        try 
        {
            if (event) await api.updateEvent(event.id, payload);
            else await api.createEvent(payload);
            onSaved?.();
        }
        catch (e) 
        {
            alert(e.message);
        }
        finally 
        {
            setBusy(false);
        }
    }

    async function del() 
    {
        if (!event) return;
        if (!canEdit) return;
        if (!confirm('Delete this event?')) return;
        setBusy(true);
        try 
        {
            await api.deleteEvent(event.id);
            onDeleted?.();
        }
        catch (e) 
        {
            alert(e.message);
        }
        finally 
        {
            setBusy(false);
        }
    }

    const writableCalendars = useMemo(
        () => calendars.filter(c =>
            !c.isSystem &&
            (!c.myRole || c.myRole === 'owner' || c.myRole === 'admin' || c.myRole === 'editor')
        ),
        [calendars]
    );

    const isArrangement = form.type === 'arrangement';
    const isReminder = form.type === 'reminder';
    const isTask = form.type === 'task';

    return createPortal(
        <div
            className="modal-backdrop"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="modal"
                onClick={(e) => e.stopPropagation()}
                style={{ zIndex: 10001 }}
            >
                <h2 style={{ marginBottom: 8 }}>
                    {event ? (canEdit ? 'Edit event' : 'Event details') : 'New event'}
                    {currentRole && (
                        <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                            ({currentRole})
                        </span>
                    )}
                </h2>

                <label className="fld">
                    <span>Title</span>
                    <input
                        value={form.title}
                        onChange={(e)=>setForm({...form, title:e.target.value})}
                        disabled={!canEdit}
                    />
                </label>

                <label className="fld">
                    <span>Type</span>
                    <select
                        value={form.type}
                        onChange={(e)=>setForm({...form, type:e.target.value})}
                        disabled={!canEdit || !!event} // lock type on existing events
                    >
                        <option value="task">Task</option>
                        <option value="arrangement">Arrangement</option>
                        <option value="reminder">Reminder</option>
                    </select>
                </label>

                <div className="row" style={{ display: 'flex', gap: 8 }}>
                    <label className="fld" style={{ flex: 1 }}>
                        <span>
                            {isArrangement
                                ? 'Start'
                                : isReminder
                                    ? 'Remind at'
                                    : 'Due date & time'}
                        </span>
                        <input
                            type="datetime-local"
                            value={form.start}
                            onChange={(e)=>setForm({...form, start:e.target.value})}
                            disabled={!canEdit}
                        />
                    </label>
                    <label className="fld" style={{ flex: 1 }}>
                        <span>
                            {isArrangement ? 'End' : 'End (same as start)'}
                        </span>
                        <input
                            type="datetime-local"
                            value={form.end}
                            onChange={(e)=>setForm({...form, end:e.target.value})}
                            disabled={!canEdit || !isArrangement}
                        />
                    </label>
                </div>

                <label className="fld">
                    <span>Calendar</span>
                    <select
                        value={form.calendarId}
                        onChange={(e)=>setForm({...form, calendarId:e.target.value})}
                        disabled={!canEdit || !!event} // don’t move existing events between calendars for now
                    >
                        {writableCalendars.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </label>

                <label className="fld">
                    <span>Location</span>
                    <input
                        value={form.location || ''}
                        onChange={(e)=>setForm({...form, location:e.target.value})}
                        disabled={!canEdit}
                    />
                </label>

                <label className="fld">
                    <span>Description</span>
                    <textarea
                        value={form.description || ''}
                        onChange={(e)=>setForm({...form, description:e.target.value})}
                        disabled={!canEdit}
                    />
                </label>

                <div className="actions" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    {event && canEdit && (
                        <button className="btn danger" onClick={del} disabled={busy}>
                            Delete
                        </button>
                    )}
                    <div style={{ flex: 1 }} />
                    <button className="btn ghost" onClick={onClose}>
                        {canEdit ? 'Cancel' : 'Close'}
                    </button>
                    {canEdit && (
                        <button
                            className="btn"
                            onClick={save}
                            disabled={!canSave || busy}
                        >
                            {event ? 'Save' : 'Create'}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

function toLocalInput(v) 
{
    const d = v instanceof Date ? v : new Date(v);
    return formatLocal(d);
}
function formatLocal(d) 
{
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
