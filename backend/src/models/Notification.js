// backend/src/models/Notification.js
import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    calendar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Calendar",
      required: true,
      index: true,
    },

    // "email", "browser" (you can extend later)
    channel: {
      type: String,
      enum: ["email", "browser"],
      required: true,
    },

    // when notification should actually fire
    sendAt: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
      index: true,
    },
    sentAt: { type: Date },
    error: { type: String },
  },
  { timestamps: true }
);

notificationSchema.plugin(toJSON);

notificationSchema.index({ status: 1, sendAt: 1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
