// frontend/src/api/client.js
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  const token = getToken();
  if (token) {
    opts.headers.Authorization = `Bearer ${token}`;
  }

  if (body) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_URL}${path}`, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.message || data?.error || "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    // you can also attach data if needed: err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // auth
  register: (data) => request("/auth/register", { method: "POST", body: data }),
  login: (data) => request("/auth/login", { method: "POST", body: data }),
  verifyTwoFactor: (data) =>
    request("/auth/2fa/verify", { method: "POST", body: data }),
  forgotPassword: (data) =>
    request("/auth/forgot-password", { method: "POST", body: data }),
  resetPassword: (data) =>
    request("/auth/reset-password", { method: "POST", body: data }),
  verifyEmail: (data) =>
    request("/auth/verify-email", { method: "POST", body: data }),
  resendVerification: (data) =>
    request("/auth/resend-verification", { method: "POST", body: data }),

  // calendars
  getCalendars: () => request("/calendars"),
  createCalendar: (data) =>
    request("/calendars", { method: "POST", body: data }),
  updateCalendar: (id, data) =>
    request(`/calendars/${id}`, { method: "PUT", body: data }),
  deleteCalendar: (id) => request(`/calendars/${id}`, { method: "DELETE" }),

  // events
  getEvents: (params = {}) => {
    const usp = new URLSearchParams();
    if (params.start) usp.set("start", params.start);
    if (params.end) usp.set("end", params.end);
    (params.calendarIds || []).forEach((id) => usp.append("calendarId", id));
    return request(`/events?${usp.toString()}`);
  },
  createEvent: (data) => request("/events", { method: "POST", body: data }),
  updateEvent: (id, data) =>
    request(`/events/${id}`, { method: "PUT", body: data }),
  deleteEvent: (id) => request(`/events/${id}`, { method: "DELETE" }),

  // calendar members & invites
  getCalendarMembers: (calendarId) =>
    request(`/calendars/${calendarId}/members`),
  inviteCalendarMember: (calendarId, data) =>
    request(`/calendars/${calendarId}/members`, {
      method: "POST",
      body: data,
    }),
  updateCalendarMember: (calendarId, userId, data) =>
    request(`/calendars/${calendarId}/members/${userId}`, {
      method: "PATCH",
      body: data,
    }),
  removeCalendarMember: (calendarId, userId) =>
    request(`/calendars/${calendarId}/members/${userId}`, {
      method: "DELETE",
    }),
  getCalendarInvites: (calendarId) =>
    request(`/calendars/${calendarId}/invites`),
  cancelCalendarInvite: (inviteId) =>
    request(`/calendars/invites/${inviteId}`, { method: "DELETE" }),
  acceptCalendarInvite: (token) =>
    request(`/calendars/invites/${token}/accept`, { method: "POST" }),
};
