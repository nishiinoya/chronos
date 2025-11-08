// Free, no-key API: https://date.nager.at
// GET /api/v3/PublicHolidays/{year}/{countryCode}
const BASE = "https://date.nager.at/api/v3";

export async function fetchPublicHolidays(year, country) 
{
    const res = await fetch(`${BASE}/PublicHolidays/${year}/${country}`);
    if (!res.ok) 
    {
        throw new Error(`Failed to fetch holidays ${year}-${country}: ${res.status}`);
    }
    return res.json(); // [{ date, localName, name, countryCode, ... }]
}
