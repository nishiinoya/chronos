// backend/src/controllers/eventController.js
import { isValid, parseISO } from 'date-fns';
import Event from '../models/Event.js';
import Calendar from '../models/Calendar.js';
import { requireCalendarRole } from '../utils/calendarAccess.js';

function toDate(val) 
{
    if (!val) return null;
    const d = typeof val === 'string' ? parseISO(val) : new Date(val);
    return isValid(d) ? d : null;
}

// GET /events?start=...&end=...&calendarId=...&calendarId=...
export async function getEvents(req, res) 
{
    const userId = req.user.id;
    const { start, end } = req.query;

    const startDate = toDate(start);
    const endDate = toDate(end);

    // find all calendars accessible to this user
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
    }
    else 
    {
        calendarIds = accessibleCalendars.map((c) => c._id);
    }

    if (!calendarIds.length) 
    {
        return res.json([]);
    }

    const filter = {
        calendarId: { $in: calendarIds },
    };

    if (startDate && endDate) 
    {
        // events overlapping [start, end]
        filter.start = { $lt: endDate };
        filter.end = { $gt: startDate };
    }
    else if (startDate) 
    {
        filter.end = { $gt: startDate };
    }
    else if (endDate) 
    {
        filter.start = { $lt: endDate };
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
    } = req.body || {};

    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!calendarId) return res.status(400).json({ error: 'calendarId is required' });

    const startDate = toDate(start);
    const endDate = toDate(end);

    if (!startDate || !endDate || endDate <= startDate) 
    {
        return res.status(400).json({ error: 'Invalid start/end' });
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
        allDay: !!allDay,
        calendarId,
        owner: userId,
        location: location || '',
        description: description || '',
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
    } = req.body || {};

    const evt = await Event.findById(id);
    if (!evt) return res.status(404).json({ error: 'Event not found' });

    // require editor/admin on the calendar of this event
    await requireCalendarRole({
        calendarId: evt.calendarId,
        userId,
        allowedRoles: ['admin', 'editor'],
    });

    if (title !== undefined) evt.title = title;
    if (allDay !== undefined) evt.allDay = !!allDay;
    if (location !== undefined) evt.location = location;
    if (description !== undefined) evt.description = description;

    let startDate = evt.start;
    let endDate = evt.end;

    if (start !== undefined) 
    {
        const parsed = toDate(start);
        if (!parsed) return res.status(400).json({ error: 'Invalid start' });
        startDate = parsed;
    }
    if (end !== undefined) 
    {
        const parsed = toDate(end);
        if (!parsed) return res.status(400).json({ error: 'Invalid end' });
        endDate = parsed;
    }

    if (endDate <= startDate) 
    {
        return res.status(400).json({ error: 'Invalid start/end (end <= start)' });
    }

    evt.start = startDate;
    evt.end = endDate;

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
