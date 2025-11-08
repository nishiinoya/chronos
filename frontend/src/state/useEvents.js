import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function useEvents(params) 
{
    const [events, setEvents] = useState([]);
    const [stamp, setStamp] = useState(0);

    const load = useCallback(() => 
    {
        if (!params.start || !params.end) return;
        api.getEvents(params).then(setEvents).catch((e) => alert(e.message));
  }, [params.start, params.end, JSON.stringify(params.calendarIds)]); // eslint-disable-line

    useEffect(() => 
    {
        load(); 
    }, [load, stamp]);

    return { events, refresh: () => setStamp((n) => n + 1) };
}
