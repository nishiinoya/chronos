// frontend/src/api/holidays.js
// Keyless holiday fetcher (Nager.Date) + tiny cache

const NAGER = 'https://date.nager.at/api/v3';

function guessCountry() 
{
    const lang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
    const p = String(lang).split('-');
    if (p.length > 1 && p[1]) return p[1].toUpperCase();

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const tzMap = {
        'Europe/Madrid': 'ES',
        'Europe/Paris': 'FR',
        'Europe/Berlin': 'DE',
        'Europe/Rome': 'IT',
        'Europe/London': 'GB',
        'America/New_York': 'US',
        'America/Los_Angeles': 'US',
    };
    return tzMap[tz] || 'US';
}

function key(country, year) 
{
    return `holidays:${country}:${year}`; 
}

export function getHolidayCalendarMeta(country = guessCountry()) 
{
    return { id: `holiday:${country}`, name: `Public Holidays (${country})`, color: '#ffd54f', readonly: true };
}

export async function getPublicHolidaysForYear(country = guessCountry(), year = new Date().getFullYear()) 
{
    const k = key(country, year);
    try 
    {
        const c = localStorage.getItem(k); if (c) return JSON.parse(c); 
    }
    catch 
    {}
    const res = await fetch(`${NAGER}/PublicHolidays/${year}/${country}`);
    if (!res.ok) throw new Error(`Holidays fetch failed: ${res.status}`);
    const data = await res.json();
    try 
    {
        localStorage.setItem(k, JSON.stringify(data)); 
    }
    catch 
    {}
    return data;
}
