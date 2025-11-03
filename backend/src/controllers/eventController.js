import Event from "../models/Event.js";
import Calendar from "../models/Calendar.js";

/** GET /api/events */
export const getEvents = async (req, res) => {
  // only events from user's calendars
  const userCalendars = await Calendar.find({ userId: req.user.id }, { _id: 1 });
  const ids = userCalendars.map(c => c._id);
  const events = await Event.find({ calendarId: { $in: ids } });
  res.json(events);
};

/** POST /api/events */
export const createEvent = async (req, res) => {
  const { calendarId, title, category, start, end, color, description } = req.body;
  if (!calendarId || !title || !category || !start)
    { res.status(400); throw new Error("calendarId, title, category, start are required"); }

  // ensure the calendar belongs to this user
  const calendar = await Calendar.findOne({ _id: calendarId, userId: req.user.id });
  if (!calendar) { res.status(403); throw new Error("Not allowed for this calendar"); }

  const event = await Event.create({ calendarId, title, category, start, end, color, description });
  res.status(201).json(event);
};
