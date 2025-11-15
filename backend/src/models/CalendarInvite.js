import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const calendarInviteSchema = new mongoose.Schema(
    {
        calendar: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Calendar",
            required: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        role: {
            type: String,
            enum: ["admin", "editor", "viewer"],
            default: "viewer",
        },
        token: {
            type: String,
            required: true,
            unique: true,
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "declined", "expired"],
            default: "pending",
        },
        invitedUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        expiresAt: {
            type: Date, // optional: you can set TTL index later if you want auto-expiry
        },
    },
    { timestamps: true }
);

calendarInviteSchema.plugin(toJSON);

// quick lookup by token + email
calendarInviteSchema.index({ token: 1 });
calendarInviteSchema.index({ calendar: 1, email: 1, status: 1 });

const CalendarInvite = mongoose.model("CalendarInvite", calendarInviteSchema);
export default CalendarInvite;
