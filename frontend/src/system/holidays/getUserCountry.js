// Robust country detection with multiple fallbacks.
// Order: cache → IP lookup → geolocation (only if already granted) → locale → "US"

async function ipCountry() 
{
    try 
    {
    // Fast, no-key endpoint returns 2-letter code in plain text (e.g., "ES")
        const r = await fetch("https://ipapi.co/country/");
        if (r.ok) 
        {
            const text = (await r.text()).trim().toUpperCase();
            if (/^[A-Z]{2}$/.test(text)) return text;
        }
    }
    catch 
    {}
    try 
    {
    // Backup: ipwho.is JSON
        const r = await fetch("https://ipwho.is/");
        if (r.ok) 
        {
            const j = await r.json();
            const code = String(j.country_code || "").toUpperCase();
            if (/^[A-Z]{2}$/.test(code)) return code;
        }
    }
    catch 
    {}
    return null;
}

async function geoCountryIfGranted() 
{
    // Only attempt geolocation if already granted; do NOT trigger a prompt.
    let granted = false;
    try 
    {
        if (navigator.permissions && navigator.permissions.query) 
        {
            const p = await navigator.permissions.query({ name: "geolocation" });
            granted = p && p.state === "granted";
        }
    }
    catch 
    {
    // Permissions API not available; treat as not granted.
    }
    if (!granted) return null;

    try 
    {
        const pos = await new Promise((resolve, reject) => 
        {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 600000,
            });
        });

        const { latitude, longitude } = pos.coords;
        const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        if (res.ok) 
        {
            const data = await res.json();
            const code = String(data.countryCode || "").toUpperCase();
            if (/^[A-Z]{2}$/.test(code)) return code;
        }
    }
    catch (err) 
    {
    // Swallow errors; we'll fall back.
    // console.warn("Geolocation lookup failed:", err);
    }
    return null;
}

function localeCountry() 
{
    try 
    {
        const lang =
      (navigator.languages && navigator.languages[0]) ||
      navigator.language ||
      Intl.DateTimeFormat().resolvedOptions().locale ||
      "en-US";
        const m = /[-_](\w{2})/i.exec(lang);
        const cc = (m ? m[1] : "US").toUpperCase();
        return cc;
    }
    catch 
    {
        return "US";
    }
}

export async function getUserCountry() 
{
    // 1) Cache
    try 
    {
        const cached = localStorage.getItem("user.countryCode");
        if (cached && /^[A-Z]{2}$/.test(cached)) return cached.toUpperCase();
    }
    catch 
    {}

    // 2) IP lookup (no permission required)
    const ip = await ipCountry();
    if (ip) 
    {
        try 
        {
            localStorage.setItem("user.countryCode", ip); 
        }
        catch 
        {}
        return ip;
    }

    // 3) Geolocation ONLY if already granted (prevents repeated "denied" errors)
    const geo = await geoCountryIfGranted();
    if (geo) 
    {
        try 
        {
            localStorage.setItem("user.countryCode", geo); 
        }
        catch 
        {}
        return geo;
    }

    // 4) Locale fallback
    const loc = localeCountry();
    try 
    {
        localStorage.setItem("user.countryCode", loc); 
    }
    catch 
    {}
    return loc;
}

// Optional manual override
export function setUserCountry(countryCode) 
{
    try 
    {
        const cc = String(countryCode).toUpperCase();
        if (/^[A-Z]{2}$/.test(cc)) localStorage.setItem("user.countryCode", cc);
    }
    catch 
    {}
}
