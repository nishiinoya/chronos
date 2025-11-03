import mongoose from "mongoose";
const eventSchema = new mongoose.Schema({
  calendarId: { type: mongoose.Schema.Types.ObjectId, ref: "Calendar", index: true },
  title: String,
  category: { type: String, enum: ["arrangement", "reminder", "task"] },
  start: Date,
  end: Date,
  color: String,
  description: String,
}, { timestamps: true });
export default mongoose.model("Event", eventSchema);
