// backend/src/controllers/eventController.js
import { isValid, parseISO } from 'date-fns';
import Event from '../models/Event.js';
import Calendar from '../models/Calendar.js';

function toDate(val) 
{
    if (!val) return null;
    const d = typeof val === 'string' ? parseISO(val) : new Date(val);
    return isValid(d) ? d : null;
}

function ensureOwnedCalendar(userId, calendarId) 
{
    return Calendar.exists({ _id: calendarId, owner: userId });
}

// GET /events?start=ISO&end=ISO&calendarId=...&calendarId=...
export async function getEvents(req, res) 
{
    const { start, end } = req.query;
    let calendarIds = req.query.calendarId;
    if (calendarIds == null) 
    {
    // if not provided, default to all user's calendars
        const cals = await Calendar.find({ owner: req.user.id }).select('_id').lean();
        calendarIds = cals.map(c => String(c._id));
    }
    else if (!Array.isArray(calendarIds)) 
    {
        calendarIds = [calendarIds];
    }

    const startAt = toDate(start);
    const endAt = toDate(end);
    if (!startAt || !endAt) 
    {
        return res.status(400).json({ error: 'start and end (ISO) are required' });
    }

    // Filter by user ownership AND the requested calendars
    const rows = await Event.find({
        owner: req.user.id,
        calendarId: { $in: calendarIds },
        // overlap where event.start < end && event.end > start
        start: { $lt: endAt },
        end:   { $gt: startAt },
    })
        .sort({ start: 1 });

    return res.json(rows);
}

// POST /events
export async function createEvent(req, res) 
{
    const {
        title, start, end, allDay = false,
        calendarId, location, description, recurrence
    } = req.body || {};

    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!calendarId) return res.status(400).json({ error: 'calendarId is required' });

    const startAt = toDate(start) || new Date(); // default now
    const endAt = toDate(end) || new Date(startAt.getTime() + 60 * 60 * 1000); // default +1h

    if (!(await ensureOwnedCalendar(req.user.id, calendarId))) 
    {
        return res.status(404).json({ error: 'Calendar not found or not owned by user' });
    }
    if (endAt <= startAt) 
    {
        return res.status(400).json({ error: 'end must be after start' });
    }

    const doc = await Event.create({
        title: String(title).trim(),
        start: startAt,
        end: endAt,
        allDay: !!allDay,
        calendarId,
        owner: req.user.id, // REQUIRED by schema
        location: location || undefined,
        description: description || undefined,
        recurrence: recurrence || undefined,
    });

    return res.status(201).json(doc);
}

// PUT /events/:id
export async function updateEvent(req, res) 
{
    const { id } = req.params;
    const {
        title, start, end, allDay,
        calendarId, location, description, recurrence
    } = req.body || {};

    const evt = await Event.findOne({ _id: id, owner: req.user.id });
    if (!evt) return res.status(404).json({ error: 'Event not found' });

    if (title != null) evt.title = String(title).trim();
    if (start != null) 
    {
        const s = toDate(start);
        if (!s) return res.status(400).json({ error: 'Invalid start' });
        evt.start = s;
    }
    if (end != null) 
    {
        const e = toDate(end);
        if (!e) return res.status(400).json({ error: 'Invalid end' });
        evt.end = e;
    }
    if (allDay != null) evt.allDay = !!allDay;

    if (calendarId != null) 
    {
    // ensure new calendar belongs to user
        if (!(await ensureOwnedCalendar(req.user.id, calendarId))) 
        {
            return res.status(404).json({ error: 'Calendar not found or not owned by user' });
        }
        evt.calendarId = calendarId;
    }

    if (location != null) evt.location = location || undefined;
    if (description != null) evt.description = description || undefined;
    if (recurrence != null) evt.recurrence = recurrence || undefined;

    if (evt.end <= evt.start) 
    {
        return res.status(400).json({ error: 'end must be after start' });
    }

    await evt.save();
    return res.json(evt);
}

// DELETE /events/:id
export async function deleteEvent(req, res) 
{
    const { id } = req.params;
    const evt = await Event.findOne({ _id: id, owner: req.user.id });
    if (!evt) return res.status(404).json({ error: 'Event not found' });
    await evt.deleteOne();
    return res.status(204).send();
}
