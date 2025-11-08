import { useEffect, useMemo, useState } from "react";
import { fetchPublicHolidays } from "./holidaysApi";
import { getUserCountry } from "./getUserCountry";
import { HOLIDAYS_CALENDAR } from "./holidaysConfig";

const cacheKey = (year, country) => `holidays.${country}.${year}`;

async function getYear(country, year) 
{
    const key = cacheKey(year, country);
    const cached = sessionStorage.getItem(key);
    if (cached) 
    {
        try 
        {
            return JSON.parse(cached); 
        }
        catch 
        {}
    }
    const data = await fetchPublicHolidays(year, country);
    sessionStorage.setItem(key, JSON.stringify(data));
    return data;
}

function mapToEvents(list, calendarId) 
{
    return list.map((h) => 
    {
        const iso = h.date; // yyyy-mm-dd
        const slug = (h.localName || h.name || "holiday").toLowerCase().replace(/[^\w]+/g, "-");
        const id = `holiday-${iso}-${(h.countryCode || "XX")}-${slug}`;
        return {
            id,
            title: h.localName || h.name,
            description: h.name && h.localName && h.name !== h.localName ? h.name : "",
            start: `${iso}T00:00:00`, // Start at midnight
            end: `${iso}T23:59:59`,   // End at end of day
            allDay: true,
            calendarId,
            locked: true,
            source: "holidays",
            meta: {
                countryCode: h.countryCode || null,
                types: h.types || null,
                launchYear: h.launchYear || null,
            },
        };
    });
}

export function useHolidays() 
{
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);

    // IMPORTANT: country starts as null; we resolve it async
    const [country, setCountry] = useState(null);

    // Stable calendar object
    const calendar = useMemo(() => ({ ...HOLIDAYS_CALENDAR }), []);

    // Resolve the country FIRST (await the async function)
    useEffect(() => 
    {
        let alive = true;
        (async () => 
        {
            try 
            {
                const cc = await getUserCountry(); // <-- await!
                if (!alive) return;
                setCountry((cc || "US").toUpperCase());
            }
            catch 
            {
                if (alive) setCountry("US");
            }
        })();
        return () => 
        {
            alive = false; 
        };
    }, []);

    // Fetch holidays ONLY after we have a concrete country string
    useEffect(() => 
    {
        if (!country) return; // wait until resolved

        let alive = true;
        (async () => 
        {
            try 
            {
                setLoading(true);
                const now = new Date();
                const y = now.getFullYear();

                const [thisYear, nextYear] = await Promise.all([
                    getYear(country, y),
                    getYear(country, y + 1),
                ]);

                if (!alive) return;

                const mapped = mapToEvents([...thisYear, ...nextYear], calendar.id);
                const dedup = Array.from(new Map(mapped.map(e => [e.id, e])).values());
                setEvents(dedup);
            }
            catch (e) 
            {
                console.error("Holidays load error:", e);
                if (alive) setEvents([]);
            }
            finally 
            {
                if (alive) setLoading(false);
            }
        })();

        return () => 
        {
            alive = false; 
        };
    }, [country, calendar.id]);

    return { calendar, country, setCountry, events, loading };
}
