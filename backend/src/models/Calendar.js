// backend/src/models/Calendar.js
import mongoose from 'mongoose';
import toJSON from './plugins/toJSON.js';

const memberSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // role for this specific calendar
        role: {
            type: String,
            enum: ['admin', 'editor', 'viewer'],
            default: 'viewer',
        },
    },
    { _id: false } // we don't need a separate _id for each member entry
);

const calendarSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        color: { type: String, default: '#6c6cff' },

        // creator = implicit super-admin of this calendar
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        // per-calendar members with roles
        members: [memberSchema],
    },
    { timestamps: true }
);

calendarSchema.plugin(toJSON);

// calendar names must be unique per owner
calendarSchema.index({ owner: 1, name: 1 }, { unique: true });

// optional: fast lookup of calendars where a user is a member
calendarSchema.index({ 'members.user': 1 });

const Calendar = mongoose.model('Calendar', calendarSchema);
export default Calendar;
