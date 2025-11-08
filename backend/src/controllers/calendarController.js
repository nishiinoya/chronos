// backend/src/controllers/calendarController.js
import Calendar from '../models/Calendar.js';
import Event from '../models/Event.js';

export async function getCalendars(req, res) 
{
    // Only calendars owned by the user (add shared logic later if needed)
    const rows = await Calendar.find({ owner: req.user.id }).sort({ createdAt: 1 });
    return res.json(rows); // toJSON plugin ensures { id, ... }
}

export async function createCalendar(req, res) 
{
    const { name, color } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });

    const doc = await Calendar.create({
        name: String(name).trim(),
        color: color || '#6c6cff',
        owner: req.user.id, // REQUIRED by schema
    });
    return res.status(201).json(doc);
}

export async function updateCalendar(req, res) 
{
    const { id } = req.params;
    const { name, color } = req.body || {};
    const cal = await Calendar.findOne({ _id: id, owner: req.user.id });
    if (!cal) return res.status(404).json({ error: 'Calendar not found' });

    if (name != null) cal.name = String(name).trim();
    if (color != null) cal.color = color;
    await cal.save();
    return res.json(cal);
}

export async function deleteCalendar(req, res) 
{
    const { id } = req.params;
    const cal = await Calendar.findOne({ _id: id, owner: req.user.id });
    if (!cal) return res.status(404).json({ error: 'Calendar not found' });

    // Optional: cascade delete events in this calendar, owned by the same user
    await Event.deleteMany({ calendarId: cal.id, owner: req.user.id });
    await cal.deleteOne();
    return res.status(204).send();
}
