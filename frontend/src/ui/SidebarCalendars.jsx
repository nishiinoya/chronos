import { useState, useMemo } from 'react';
import { useAuth } from '../state/AuthContext.jsx';
import CalendarEditModal from './modals/CalendarEditModal.jsx';

// Inject Holidays system calendar here (read-only, undeletable)
import { useHolidays } from '../system/holidays';

export default function SidebarCalendars({
    calendars, activeIds, onToggle, onCreate, /* new: */ onUpdate, onDelete
})
{
    const [name, setName] = useState('');
    const [color, setColor] = useState('#6c6cff');
    const [editing, setEditing] = useState(null); // calendar object
    const { user, logout } = useAuth();

    // Get system Holidays calendar and prepend it
    const { calendar: holidaysCal, events: holidayEvents, loading } = useHolidays();

    const allCalendars = useMemo(() => 
    {
    // Ensure uniqueness by id, with Holidays first
        return [holidaysCal, ...calendars.filter(c => c.id !== holidaysCal.id)];
    }, [calendars, holidaysCal]);

    return (
        <aside className="sidebar">
            <div className="sidebar-title">Calendars</div>

            <ul className="calendar-list">
                {allCalendars.map((c, i) => 
                {
                    const isHolidays = c.id === holidaysCal.id;
                    const key = `${c.id ?? c._id ?? c.name ?? 'cal'}-${i}`;
                    return (
                        <li key={key} className="calendar-item">
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                <input
                                    type="checkbox"
                                    checked={activeIds.includes(c.id)}
                                    onChange={() => onToggle(c.id)}
                                />
                                <span className="color-dot" style={{ background: c.color }} />
                                <span style={{ flex: 1 }}>
                                    {c.name}
                                    {isHolidays && (
                                        <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                      (read-only)
                                        </span>
                                    )}
                                </span>
                            </label>

                            {/* Disable editing UI for Holidays calendar */}
                            {!isHolidays && (
                                <button className="btn icon" title="Edit" onClick={() => setEditing(c)}>✎</button>
                            )}
                        </li>
                    );
                })}
            </ul>

            {/* Small status for holiday events */}
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                {loading ? 'Loading holidays…' : `${holidayEvents.length} holidays loaded`}
            </div>

            <form
                className="create-row"
                onSubmit={(e) => 
                {
                    e.preventDefault();
                    if (!name.trim()) return;
                    onCreate({ name, color });
                    setName(''); setColor('#6c6cff');
                }}
            >
                <input
                    className="input"
                    placeholder="New calendar name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <input
                    title="Color"
                    type="color"
                    className="input"
                    value={color}
                    onChange={(e)=>setColor(e.target.value)}
                    style={{ padding: 0, width: 44, minWidth: 44 }}
                />
                <button className="btn" type="submit">Add</button>
            </form>

            <div className="sidebar-user">
                <div className="muted">{user ? `Signed in as ${user.name || user.email}` : ''}</div>
                <button className="btn" onClick={logout}>Logout</button>
            </div>

            {editing && (
                <CalendarEditModal
                    calendar={editing}
                    onClose={()=>setEditing(null)}
                    onSave={(patch)=>
                    {
                        onUpdate(editing.id, patch); setEditing(null); 
                    }}
                    onDelete={()=>
                    {
                        // Prevent deleting the Holidays calendar at call site too (belt & suspenders)
                        if (editing.id === holidaysCal.id) return;
                        if (confirm('Delete this calendar and its events?')) 
                        {
                            onDelete(editing.id); setEditing(null);
                        }
                    }}
                />
            )}
        </aside>
    );
}
