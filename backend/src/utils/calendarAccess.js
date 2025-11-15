// backend/src/utils/calendarAccess.js
import Calendar from '../models/Calendar.js';

export const CALENDAR_ROLES = {
    OWNER: 'owner',   // virtual, we don’t store it, based on `owner` field
    ADMIN: 'admin',
    EDITOR: 'editor',
    VIEWER: 'viewer',
    INVITED: 'invited', // for future use
};
export async function getUserCalendarRole(calendarId, userId) 
{
    const calendar = await Calendar.findById(calendarId).select('owner members name color');
    if (!calendar) return { calendar: null, role: null };

    // owner is always "super admin"
    if (String(calendar.owner) === String(userId)) 
    {
        return { calendar, role: CALENDAR_ROLES.OWNER };
    }

    const member = calendar.members.find(
        (m) => String(m.user) === String(userId)
    );

    return {
        calendar,
        role: member?.role ?? null,
    };
}

/**
 * Ensure user has one of the allowed roles on the calendar.
 * Throws an Error with status = 404 or 403 on failure.
 * Returns the calendar document on success.
 */
export async function requireCalendarRole({ calendarId, userId, allowedRoles }) 
{
    const { calendar, role } = await getUserCalendarRole(calendarId, userId);

    if (!calendar) 
    {
        const err = new Error('Calendar not found');
        err.status = 404;
        throw err;
    }

    // owner is always allowed
    if (role === CALENDAR_ROLES.OWNER) 
    {
        return calendar;
    }

    if (!role || !allowedRoles.includes(role)) 
    {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
    }

    return calendar;
}
