const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getToken() 
{
    try 
    {
        return localStorage.getItem("token");
    }
    catch 
    {
        return null;
    }
}


async function request(path, { method = "GET", body, headers = {} } = {}) 
{
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) 
    {
    // bubble up; UI will redirect to login
        const msg = await res.text().catch(() => "");
        throw new Error(`Unauthorized: ${msg || "Please login again."}`);
    }

    if (!res.ok) 
    {
        const text = await res.text().catch(() => "");
        throw new Error(`API ${method} ${path} failed: ${res.status} ${text}`);
    }
    return res.status === 204 ? null : res.json();
}

export const api = {
    // auth
    register: (data) => request('/auth/register', { method: 'POST', body: data }),
    login:    (data) => request('/auth/login', { method: 'POST', body: data }),

    // calendars
    getCalendars: () => request('/calendars'),
    createCalendar: (data) => request('/calendars', { method: 'POST', body: data }),
    updateCalendar: (id, data) => request(`/calendars/${id}`, { method: 'PUT', body: data }),
    deleteCalendar: (id) => request(`/calendars/${id}`, { method: 'DELETE' }),

    // events
    getEvents: (params = {}) => 
    {
        const usp = new URLSearchParams();
        if (params.start) usp.set('start', params.start);
        if (params.end) usp.set('end', params.end);
        (params.calendarIds || []).forEach((id) => usp.append('calendarId', id));
        return request(`/events?${usp.toString()}`);
    },
    createEvent: (data) => request('/events', { method: 'POST', body: data }),
    updateEvent: (id, data) => request(`/events/${id}`, { method: 'PUT', body: data }),
    deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE' }),
};
