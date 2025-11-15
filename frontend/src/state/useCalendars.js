import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../state/AuthContext.jsx';

const fallbackColors = ['#6c6cff', '#56b4d3', '#a16eff', '#72d572', '#ff8a65', '#ffd54f'];

function computeMyRole(calendar, userId) 
{
    if (!userId) return null;

    // owner
    if (calendar.owner && String(calendar.owner) === String(userId)) 
    {
        return 'owner';
    }

    // members: [{ user, role }]
    if (Array.isArray(calendar.members)) 
    {
        const m = calendar.members.find(
            (m) => m.user && String(m.user) === String(userId)
        );
        if (m?.role) return m.role;
    }

    return null;
}

export default function useCalendars() 
{
    const [calendars, setCalendars] = useState([]);
    const [activeId, setActiveId] = useState(null);

    const { user } = useAuth();
    const userId = user?.id ?? user?._id ?? user?.userId ?? null;

    useEffect(() => 
    {
        (async () => 
        {
            try 
            {
                const data = await api.getCalendars();
                const enriched = data.map((c, i) => 
                {
                    const id = c.id ?? c._id ?? String(i);
                    const color = c.color || fallbackColors[i % fallbackColors.length];
                    const myRole = computeMyRole(c, userId);

                    return {
                        ...c,
                        id,
                        color,
                        myRole,
                    };
                });

                setCalendars(enriched);

                setActiveId((prev) =>
                    prev && enriched.some(c => c.id === prev)
                        ? prev
                        : enriched[0]?.id ?? null
                );
            }
            catch (e) 
            {
                alert(e.message);
            }
        })();
    // re-run if user changes (login/logout)
    }, [userId]);

    function selectCalendar(id) 
    {
        setActiveId((prev) => prev === id ? null : id);
    }

    async function createCalendar({ name, color }) 
    {
        try 
        {
            const created = await api.createCalendar({ name, color });
            const id = created.id ?? created._id;
            const myRole = computeMyRole(created, userId) || (userId ? 'owner' : null);

            const withMeta = {
                ...created,
                id,
                color: created.color || color || fallbackColors[0],
                myRole,
            };

            setCalendars((prev) => [...prev, withMeta]);
            setActiveId(withMeta.id);
        }
        catch (e) 
        {
            alert(e.message);
        }
    }

    async function updateCalendar(id, patch) 
    {
        try 
        {
            const updated = await api.updateCalendar(id, patch);
            const withId = { ...updated, id: updated.id ?? updated._id };

            // recompute myRole using latest owner/members
            const myRole = computeMyRole(withId, userId);

            setCalendars((prev) =>
                prev.map(c => c.id === id
                    ? { ...withId, color: withId.color || c.color, myRole }
                    : c
                )
            );
        }
        catch (e) 
        {
            alert(e.message);
        }
    }

    async function deleteCalendar(id) 
    {
        try 
        {
            await api.deleteCalendar(id);
            setCalendars((prev) =>
            {
                const filtered = prev.filter(c => c.id !== id);
                setActiveId((currentActive) =>
                {
                    if (currentActive !== id) return currentActive;
                    return filtered[0]?.id ?? null;
                });
                return filtered;
            });
        }
        catch (e) 
        {
            alert(e.message);
        }
    }

    return { calendars, activeId, selectCalendar, createCalendar, updateCalendar, deleteCalendar };
}
