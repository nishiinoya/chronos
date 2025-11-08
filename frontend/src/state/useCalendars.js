import { useEffect, useState } from 'react';
import { api } from '../api/client.js';


const fallbackColors = ['#6c6cff', '#56b4d3', '#a16eff', '#72d572', '#ff8a65', '#ffd54f'];

export default function useCalendars() 
{
    const [calendars, setCalendars] = useState([]);
    const [activeIds, setActiveIds] = useState([]);

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
                    return { ...c, id, color: c.color || fallbackColors[i % fallbackColors.length] };
                });
                setCalendars(enriched);
                setActiveIds(enriched.map((c) => c.id));
            }
            catch (e) 
            {
                alert(e.message); 
            }
        })();
    }, []);

    function toggleCalendar(id) 
    {
        setActiveIds((ids) => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
    }

    async function createCalendar({ name, color }) 
    {
        try 
        {
            const created = await api.createCalendar({ name, color });
            const withId = { ...created, id: created.id ?? created._id };
            setCalendars((prev) => [...prev, withId]);
            setActiveIds((ids) => [...ids, withId.id]);
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
            setCalendars((prev) => prev.map(c => c.id === id ? withId : c));
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
            setCalendars((prev) => prev.filter(c => c.id !== id));
            setActiveIds((ids) => ids.filter(x => x !== id));
        }
        catch (e) 
        {
            alert(e.message); 
        }
    }

    return { calendars, activeIds, toggleCalendar, createCalendar, updateCalendar, deleteCalendar };
}
