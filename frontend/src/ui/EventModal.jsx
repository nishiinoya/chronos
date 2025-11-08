import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';

export default function EventModal({ date, event, calendars, onClose, onSaved, onDeleted }) 
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
                description: event.description || ''
            };
        }
        const start = date ? new Date(date) : new Date();
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        return {
            title: '',
            start: formatLocal(start),
            end: formatLocal(end),
            calendarId: calendars.find(c => !c.isSystem)?.id || calendars[0]?.id
        };
    });

    const [busy, setBusy] = useState(false);
    const canSave = form.title && form.start && form.end && form.calendarId;

    useEffect(() => 
    {
        const h = (e) => 
        {
            if (e.key === 'Escape') onClose?.(); 
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    async function save() 
    {
        if (!canSave) return;
        setBusy(true);
        const payload = {
            ...form,
            start: new Date(form.start).toISOString(),
            end: new Date(form.end).toISOString(),
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
                style={{
                    zIndex: 10001,
                }}
            >
                <h2 style={{ marginBottom: 8 }}>{event ? 'Edit event' : 'New event'}</h2>

                <label className="fld">
                    <span>Title</span>
                    <input value={form.title} onChange={(e)=>setForm({...form, title:e.target.value})} />
                </label>

                <div className="row" style={{ display: 'flex', gap: 8 }}>
                    <label className="fld" style={{ flex: 1 }}>
                        <span>Start</span>
                        <input type="datetime-local" value={form.start} onChange={(e)=>setForm({...form, start:e.target.value})} />
                    </label>
                    <label className="fld" style={{ flex: 1 }}>
                        <span>End</span>
                        <input type="datetime-local" value={form.end} onChange={(e)=>setForm({...form, end:e.target.value})} />
                    </label>
                </div>

                <label className="fld">
                    <span>Calendar</span>
                    <select
                        value={form.calendarId}
                        onChange={(e)=>setForm({...form, calendarId:e.target.value})}
                    >
                        {calendars.map(c => !c.isSystem ? (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ) : null)}
                    </select>
                </label>

                <label className="fld">
                    <span>Location</span>
                    <input value={form.location || ''} onChange={(e)=>setForm({...form, location:e.target.value})} />
                </label>

                <label className="fld">
                    <span>Description</span>
                    <textarea value={form.description || ''} onChange={(e)=>setForm({...form, description:e.target.value})} />
                </label>

                <div className="actions" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    {event && <button className="btn danger" onClick={del} disabled={busy}>Delete</button>}
                    <div style={{ flex: 1 }} />
                    <button className="btn ghost" onClick={onClose}>Cancel</button>
                    <button className="btn" onClick={save} disabled={!canSave || busy}>{event ? 'Save' : 'Create'}</button>
                </div>
            </div>
        </div>,
        document.body
    );
}

function toLocalInput(v) 
{
    // handle Date or ISO
    const d = v instanceof Date ? v : new Date(v);
    return formatLocal(d);
}
function formatLocal(d) 
{
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
