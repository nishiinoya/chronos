import mongoose from "mongoose";
const calendarSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  name: { type: String, default: "Main Calendar" },
  color: { type: String, default: "#4285F4" },
  description: String,
}, { timestamps: true });
export default mongoose.model("Calendar", calendarSchema);
