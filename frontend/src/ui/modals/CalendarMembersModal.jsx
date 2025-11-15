import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const ROLE_OPTIONS = [
    { value: 'admin',  label: 'Admin' },
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Viewer' },
];

export default function CalendarMembersModal({ calendar, onClose }) 
{
    const [loading, setLoading] = useState(true);
    const [owner, setOwner] = useState(null);
    const [members, setMembers] = useState([]);
    const [invites, setInvites] = useState([]);
    const [error, setError] = useState(null);

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('viewer');
    const [busy, setBusy] = useState(false);

    useEffect(() => 
    {
        const onEsc = (e) =>
        {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [onClose]);

    useEffect(() =>
    {
        let ignore = false;
        (async () =>
        {
            try 
            {
                setLoading(true);
                setError(null);
                const m = await api.getCalendarMembers(calendar.id);
                const inv = await api.getCalendarInvites(calendar.id);
                if (ignore) return;
                setOwner(m.owner);
                setMembers(m.members || []);
                setInvites(inv || []);
            }
            catch (e)
            {
                if (!ignore) setError(e.message);
            }
            finally
            {
                if (!ignore) setLoading(false);
            }
        })();
        return () => 
        {
            ignore = true; 
        };
    }, [calendar.id]);

    async function changeMemberRole(userId, role)
    {
        try 
        {
            await api.updateCalendarMember(calendar.id, userId, { role });
            setMembers((prev) => prev.map(m => m.userId === userId ? { ...m, role } : m));
        }
        catch (e)
        {
            alert(e.message);
        }
    }

    async function removeMember(userId)
    {
        if (!confirm('Remove this member from the calendar?')) return;
        try 
        {
            await api.removeCalendarMember(calendar.id, userId);
            setMembers((prev) => prev.filter(m => m.userId !== userId));
        }
        catch (e)
        {
            alert(e.message);
        }
    }

    async function sendInvite(e)
    {
        e?.preventDefault?.();
        if (!inviteEmail.trim()) return;
        setBusy(true);
        try 
        {
            const res = await api.inviteCalendarMember(calendar.id, {
                email: inviteEmail.trim(),
                role: inviteRole,
            });
            // optimistic: push invite to list
            setInvites((prev) => [
                ...prev,
                {
                    id: res.inviteId || res.id || res.token, // backend shape may vary
                    email: inviteEmail.trim(),
                    role: inviteRole,
                    status: 'pending',
                },
            ]);
            setInviteEmail('');
            setInviteRole('viewer');
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

    async function cancelInvite(inviteId)
    {
        if (!confirm('Cancel this invite?')) return;
        try 
        {
            await api.cancelCalendarInvite(inviteId);
            setInvites((prev) => prev.filter(i => i.id !== inviteId));
        }
        catch (e)
        {
            alert(e.message);
        }
    }

    return (
        <div className="modal-backdrop">
            <div className="modal">
                <div className="modal-header">
                    <h2>Manage members – {calendar.name}</h2>
                    <button className="btn icon" onClick={onClose}>✕</button>
                </div>

                {loading && <div className="muted">Loading…</div>}
                {error && <div className="error">{error}</div>}

                {!loading && !error && (
                    <>
                        <section>
                            <h3>Owner</h3>
                            {owner ? (
                                <div className="card-row">
                                    <div>
                                        <div>{owner.name || owner.email}</div>
                                        <div className="muted" style={{ fontSize: 12 }}>{owner.email}</div>
                                    </div>
                                    <div className="pill">Owner</div>
                                </div>
                            ) : (
                                <div className="muted">No owner info</div>
                            )}
                        </section>

                        <section style={{ marginTop: 16 }}>
                            <h3>Members</h3>
                            {members.length === 0 && (
                                <div className="muted">No other members yet.</div>
                            )}
                            {members.map((m) => (
                                <div key={m.userId} className="card-row">
                                    <div>
                                        <div>{m.name || m.email}</div>
                                        <div className="muted" style={{ fontSize: 12 }}>{m.email}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <select
                                            className="input"
                                            value={m.role}
                                            onChange={(e) => changeMemberRole(m.userId, e.target.value)}
                                        >
                                            {ROLE_OPTIONS.map((r) => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                        <button
                                            className="btn ghost"
                                            onClick={() => removeMember(m.userId)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </section>

                        <section style={{ marginTop: 16 }}>
                            <h3>Pending invites</h3>
                            {invites.length === 0 && (
                                <div className="muted">No pending invites.</div>
                            )}
                            {invites.map((inv) => (
                                <div key={inv.id} className="card-row">
                                    <div>
                                        <div>{inv.email}</div>
                                        <div className="muted" style={{ fontSize: 12 }}>
                                            {inv.role} · {inv.status}
                                        </div>
                                    </div>
                                    {inv.status === 'pending' && (
                                        <button
                                            className="btn ghost"
                                            onClick={() => cancelInvite(inv.id)}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            ))}
                        </section>

                        <section style={{ marginTop: 16 }}>
                            <h3>Invite new member</h3>
                            <form
                                className="row"
                                onSubmit={sendInvite}
                                style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                            >
                                <input
                                    className="input"
                                    placeholder="email@example.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                />
                                <select
                                    className="input"
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    style={{ maxWidth: 140 }}
                                >
                                    {ROLE_OPTIONS.map((r) => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                                <button className="btn" type="submit" disabled={busy || !inviteEmail.trim()}>
                                    Send invite
                                </button>
                            </form>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}
