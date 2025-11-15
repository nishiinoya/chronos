// backend/src/controllers/eventController.js
import { isValid, parseISO, addMinutes } from 'date-fns';
import Event from '../models/Event.js';
import Calendar from '../models/Calendar.js';
import { requireCalendarRole } from '../utils/calendarAccess.js';

function toDate(val) 
{
    if (!val) return null;
    const d = typeof val === 'string' ? parseISO(val) : new Date(val);
    return isValid(d) ? d : null;
}

const ALLOWED_TYPES = ['arrangement', 'reminder', 'task'];
const DEFAULT_ARRANGEMENT_DURATION_MIN = 60;

// GET /events?start=...&end=...&calendarId=...&calendarId=...
export async function getEvents(req, res) 
{
    const userId = req.user.id;
    const { start, end } = req.query;

    // Helper that accepts ISO strings, Date, or millis (string/number)
    function toDateFlexible(val) 
    {
        if (!val) return null;
        if (val instanceof Date) return val;

        if (typeof val === 'number') 
        {
            const d = new Date(val);
            return isValid(d) ? d : null;
        }

        if (typeof val === 'string') 
        {
            // numeric string? treat as millis
            if (/^\d+$/.test(val)) 
            {
                const n = Number(val);
                if (!Number.isNaN(n)) 
                {
                    const d = new Date(n);
                    return isValid(d) ? d : null;
                }
            }
            const d = parseISO(val);
            return isValid(d) ? d : null;
        }

        const d = new Date(val);
        return isValid(d) ? d : null;
    }

    const startDate = toDateFlexible(start);
    const endDate   = toDateFlexible(end);

    // 1) find all calendars accessible to this user
    const accessibleCalendars = await Calendar.find({
        $or: [
            { owner: userId },
            { 'members.user': userId },
        ],
    }).select('_id');

    if (!accessibleCalendars.length) 
    {
        return res.json([]);
    }

    // 2) figure out which calendarIds from query we actually allow
    let requestedIds = req.query.calendarId;
    if (requestedIds && !Array.isArray(requestedIds)) 
    {
        requestedIds = [requestedIds];
    }

    let calendarIds;
    if (requestedIds && requestedIds.length) 
    {
        const set = new Set(requestedIds.map(String));

        calendarIds = accessibleCalendars
            .filter((c) => set.has(String(c._id)))
            .map((c) => c._id);

        // If the client asked for calendars we don't know, fallback to "all accessible"
        if (!calendarIds.length) 
        {
            calendarIds = accessibleCalendars.map((c) => c._id);
        }
    }
    else 
    {
        calendarIds = accessibleCalendars.map((c) => c._id);
    }

    if (!calendarIds.length) 
    {
        return res.json([]);
    }

    // 3) build time filter: inclusive overlap
    const filter = {
        calendarId: { $in: calendarIds },
    };

    if (startDate && endDate) 
    {
        // events where [event.start, event.end] overlaps [startDate, endDate]
        filter.start = { $lte: endDate };   // event.start <= endDate
        filter.end   = { $gte: startDate }; // event.end   >= startDate
    }
    else if (startDate) 
    {
        filter.end = { $gte: startDate };
    }
    else if (endDate) 
    {
        filter.start = { $lte: endDate };
    }

    const events = await Event.find(filter).sort({ start: 1 });
    return res.json(events);
}


// POST /events
export async function createEvent(req, res) 
{
    const userId = req.user.id;
    const {
        title,
        start,
        end,
        allDay,
        calendarId,
        location,
        description,
        type,
    } = req.body || {};

    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!calendarId) return res.status(400).json({ error: 'calendarId is required' });

    const eventType = type || 'task';
    if (!ALLOWED_TYPES.includes(eventType)) 
    {
        return res.status(400).json({ error: 'Invalid type' });
    }

    // parse start/end from client (always sent as ISO)
    const startDateRaw = toDate(start);
    const endDateRaw = toDate(end);

    let startDate;
    let endDate;
    let reminderAt = undefined;
    let dueDate = undefined;
    let isAllDay = !!allDay;

    if (eventType === 'arrangement') 
    {
        if (!startDateRaw) 
        {
            return res.status(400).json({ error: 'start is required for arrangement' });
        }
        startDate = startDateRaw;

        if (endDateRaw && endDateRaw > startDateRaw) 
        {
            endDate = endDateRaw;
        }
        else 
        {
            endDate = addMinutes(startDateRaw, DEFAULT_ARRANGEMENT_DURATION_MIN);
        }
    }
    else if (eventType === 'reminder') 
    {
        if (!startDateRaw) 
        {
            return res.status(400).json({ error: 'reminder time is required' });
        }
        reminderAt = startDateRaw;
        startDate = reminderAt;
        endDate = reminderAt;
        isAllDay = false;
    }
    else if (eventType === 'task') 
    {
        if (!startDateRaw) 
        {
            return res.status(400).json({ error: 'due date is required for task' });
        }
        dueDate = startDateRaw;
        startDate = dueDate;
        endDate = dueDate;
        // you can decide whether tasks are all-day by default
        // isAllDay = true;
    }

    // need at least editor/admin on this calendar
    await requireCalendarRole({
        calendarId,
        userId,
        allowedRoles: ['admin', 'editor'],
    });

    const evt = new Event({
        title,
        start: startDate,
        end: endDate,
        allDay: isAllDay,
        calendarId,
        owner: userId,
        location: location || '',
        description: description || '',
        type: eventType,
        reminderAt,
        dueDate,
    });

    await evt.save();
    return res.status(201).json(evt);
}

// PUT /events/:id
export async function updateEvent(req, res) 
{
    const userId = req.user.id;
    const { id } = req.params;
    const {
        title,
        start,
        end,
        allDay,
        location,
        description,
        type,
    } = req.body || {};

    const evt = await Event.findById(id);
    if (!evt) return res.status(404).json({ error: 'Event not found' });

    // require editor/admin on the calendar of this event
    await requireCalendarRole({
        calendarId: evt.calendarId,
        userId,
        allowedRoles: ['admin', 'editor'],
    });

    // update basic scalar fields first
    if (title !== undefined) evt.title = title;
    if (location !== undefined) evt.location = location;
    if (description !== undefined) evt.description = description;

    let eventType = evt.type || 'task';

    if (type !== undefined) 
    {
        if (!ALLOWED_TYPES.includes(type)) 
        {
            return res.status(400).json({ error: 'Invalid type' });
        }
        eventType = type;
        evt.type = type;
    }

    // we treat "start" from client as:
    // - arrangement: start
    // - reminder: reminderAt
    // - task: dueDate
    const startFromBody = start !== undefined ? toDate(start) : null;
    const endFromBody = end !== undefined ? toDate(end) : null;

    if (eventType === 'arrangement') 
    {
        // arrangement: start + end (with default duration)
        if (start !== undefined) 
        {
            if (!startFromBody) return res.status(400).json({ error: 'Invalid start' });
            evt.start = startFromBody;
        }

        if (end !== undefined) 
        {
            if (!endFromBody) return res.status(400).json({ error: 'Invalid end' });
            evt.end = endFromBody;
        }

        // if end <= start or end missing, fix with default duration
        if (!evt.end || evt.end <= evt.start) 
        {
            evt.end = addMinutes(evt.start, DEFAULT_ARRANGEMENT_DURATION_MIN);
        }

        if (allDay !== undefined) 
        {
            evt.allDay = !!allDay;
        }
        evt.reminderAt = undefined;
        evt.dueDate = undefined;
    }
    else if (eventType === 'reminder') 
    {
        // reminder: single moment
        if (start !== undefined) 
        {
            if (!startFromBody) return res.status(400).json({ error: 'Invalid reminder time' });
            evt.reminderAt = startFromBody;
            evt.start = startFromBody;
            evt.end = startFromBody;
        }
        // ignore "end" from body for reminder
        evt.allDay = false;
        evt.dueDate = undefined;
    }
    else if (eventType === 'task') 
    {
        // task: due date
        if (start !== undefined) 
        {
            if (!startFromBody) return res.status(400).json({ error: 'Invalid due date' });
            evt.dueDate = startFromBody;
            evt.start = startFromBody;
            evt.end = startFromBody;
        }
        // ignore "end" from body for task
        if (allDay !== undefined) 
        {
            evt.allDay = !!allDay;
        }
        evt.reminderAt = undefined;
    }

    // final safety check for time ordering
    if (!evt.start || !evt.end || evt.end < evt.start) 
    {
        return res.status(400).json({ error: 'Invalid start/end after update' });
    }

    await evt.save();
    return res.json(evt);
}

// DELETE /events/:id
export async function deleteEvent(req, res) 
{
    const userId = req.user.id;
    const { id } = req.params;

    const evt = await Event.findById(id);
    if (!evt) return res.status(404).json({ error: 'Event not found' });

    // require editor/admin on the calendar of this event
    await requireCalendarRole({
        calendarId: evt.calendarId,
        userId,
        allowedRoles: ['admin', 'editor'],
    });

    await evt.deleteOne();
    return res.status(204).send();
}
