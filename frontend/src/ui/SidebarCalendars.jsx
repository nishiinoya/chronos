import { useState, useMemo } from 'react';
import { useAuth } from '../state/AuthContext.jsx';
import CalendarEditModal from './modals/CalendarEditModal.jsx';
import CalendarMembersModal from './modals/CalendarMembersModal.jsx';
import { useHolidays } from '../system/holidays';

export default function SidebarCalendars({
    calendars,
    activeCalendarId,
    onSelectCalendar,
    showHolidays,
    onToggleHolidays,
    onCreate,
    onUpdate,
    onDelete,
})
{
    const [name, setName] = useState('');
    const [color, setColor] = useState('#6c6cff');
    const [editing, setEditing] = useState(null);      // calendar object
    const [managing, setManaging] = useState(null);    // calendar object
    const { user, logout } = useAuth();

    const { calendar: holidaysCal, events: holidayEvents, loading } = useHolidays();

    const userId = user?.id ?? user?._id ?? null;

    // decorate calendars with myRole (owner | admin | editor | viewer | null)
    const decoratedCalendars = useMemo(() => 
    {
        return calendars.map((c) => 
        {
            let myRole = null;

            if (userId) 
            {
                if (String(c.owner) === String(userId)) 
                {
                    myRole = 'owner';
                }
                else if (Array.isArray(c.members)) 
                {
                    const m = c.members.find(m => String(m.user) === String(userId));
                    myRole = m?.role ?? null;
                }
            }

            return { ...c, myRole };
        });
    }, [calendars, userId]);

    const ownedCalendars = useMemo(
        () => decoratedCalendars.filter(c => c.myRole === 'owner'),
        [decoratedCalendars]
    );

    const sharedCalendars = useMemo(
        () => decoratedCalendars.filter(c => c.myRole && c.myRole !== 'owner'),
        [decoratedCalendars]
    );

    function handleCreate(e)
    {
        e.preventDefault();
        if (!name.trim()) return;
        onCreate({ name, color });
        setName('');
        setColor('#6c6cff');
    }

    function renderCalendarRow(c)
    {
        const isActive = c.id === activeCalendarId;
        const canManageMembers = c.myRole === 'owner' || c.myRole === 'admin';
        const canEditCalendar  = c.myRole === 'owner' || c.myRole === 'admin';

        let roleLabel = '';
        if (c.myRole === 'owner') roleLabel = 'owner';
        else if (c.myRole === 'admin') roleLabel = 'admin';
        else if (c.myRole === 'editor') roleLabel = 'editor';
        else if (c.myRole === 'viewer') roleLabel = 'viewer';

        return (
            <li
                key={c.id ?? c._id ?? c.name}
                className="calendar-item"
            >
                <button
                    className="btn ghost"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flex: 1,
                        justifyContent: 'flex-start',
                        border: 'none',
                        background: 'transparent',
                        paddingLeft: 0,
                    }}
                    onClick={() => onSelectCalendar(c.id)}
                >
                    <span
                        className="color-dot"
                        style={{ background: c.color }}
                    />
                    <span style={{ flex: 1 }}>
                        {c.name}
                        {roleLabel && (
                            <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
                                ({roleLabel})
                            </span>
                        )}
                        {isActive && (
                            <span className="pill" style={{ marginLeft: 6 }}>
                                Active
                            </span>
                        )}
                    </span>
                </button>

                {canManageMembers && (
                    <button
                        className="btn icon"
                        title="Members"
                        onClick={() => setManaging(c)}
                    >
                        👥
                    </button>
                )}

                {canEditCalendar && (
                    <button
                        className="btn icon"
                        title="Edit"
                        onClick={() => setEditing(c)}
                    >
                        ✎
                    </button>
                )}
            </li>
        );
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-title">Calendars</div>

            {/* Holidays toggle */}
            <ul className="calendar-list">
                <li className="calendar-item">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        <input
                            type="checkbox"
                            checked={showHolidays}
                            onChange={() => onToggleHolidays(!showHolidays)}
                        />
                        <span className="color-dot" style={{ background: holidaysCal.color }} />
                        <span style={{ flex: 1 }}>
                            {holidaysCal.name}
                            <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                                (holidays)
                            </span>
                        </span>
                    </label>
                </li>
            </ul>

            <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                {loading ? 'Loading holidays…' : `${holidayEvents.length} holidays loaded`}
            </div>

            {/* My calendars */}
            <div style={{ marginTop: 16 }}>
                <div className="sidebar-section-title">My calendars</div>
                <ul className="calendar-list">
                    {ownedCalendars.length === 0 && (
                        <li className="calendar-item">
                            <span className="muted" style={{ fontSize: 12 }}>
                                You don&apos;t own any calendars yet.
                            </span>
                        </li>
                    )}
                    {ownedCalendars.map(renderCalendarRow)}
                </ul>
            </div>

            {/* Shared with me */}
            <div style={{ marginTop: 16 }}>
                <div className="sidebar-section-title">Shared with me</div>
                <ul className="calendar-list">
                    {sharedCalendars.length === 0 && (
                        <li className="calendar-item">
                            <span className="muted" style={{ fontSize: 12 }}>
                                No calendars shared with you.
                            </span>
                        </li>
                    )}
                    {sharedCalendars.map(renderCalendarRow)}
                </ul>
            </div>

            {/* Create calendar */}
            <form className="create-row" onSubmit={handleCreate}>
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

            {/* User info */}
            <div className="sidebar-user">
                <div className="muted">
                    {user ? `Signed in as ${user.name || user.email}` : ''}
                </div>
                <button className="btn" onClick={logout}>Logout</button>
            </div>

            {editing && (
                <CalendarEditModal
                    calendar={editing}
                    onClose={() => setEditing(null)}
                    onSave={(patch) =>
                    {
                        onUpdate(editing.id, patch);
                        setEditing(null);
                    }}
                    onDelete={() =>
                    {
                        if (editing.id === holidaysCal.id) return;
                        if (confirm('Delete this calendar and its events?')) 
                        {
                            onDelete(editing.id);
                            setEditing(null);
                        }
                    }}
                />
            )}

            {managing && (
                <CalendarMembersModal
                    calendar={managing}
                    onClose={() => setManaging(null)}
                />
            )}
        </aside>
    );
}
