import Calendar from "../models/Calendar.js";

/** GET /api/calendars */
export const getCalendars = async (req, res) => {
  const calendars = await Calendar.find({ userId: req.user.id }).sort({ createdAt: 1 });
  res.json(calendars);
};

/** POST /api/calendars */
export const createCalendar = async (req, res) => {
  const { name, color, description } = req.body;
  if (!name) {
    res.status(400);
    throw new Error("Name is required");
  }
  const calendar = await Calendar.create({
    userId: req.user.id,
    name,
    color,
    description,
  });
  res.status(201).json(calendar);
};
