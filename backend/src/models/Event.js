// backend/src/models/Event.js
import mongoose from 'mongoose';
import toJSON from './plugins/toJSON.js';

const eventSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },

        // base time fields (always stored so the calendar can render them)
        start: { type: Date, required: true },
        end:   { type: Date, required: true },

        allDay: { type: Boolean, default: false },

        calendarId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Calendar',
            required: true,
            index: true,
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        // category of the event
        type: {
            type: String,
            enum: ['arrangement', 'reminder', 'task'],
            default: 'task',
        },

        // type-specific fields:

        // for reminders: exact moment when reminder should fire
        reminderAt: {
            type: Date,
        },

        // for tasks: due date/time
        dueDate: {
            type: Date,
        },

        // you can extend later with completed, priority, etc.
        // completed: { type: Boolean, default: false },

        location: { type: String, default: '' },
        description: { type: String, default: '' },
    },
    { timestamps: true }
);

eventSchema.plugin(toJSON);

// index to find events by calendar + time range
eventSchema.index({ calendarId: 1, start: 1 });

const Event = mongoose.model('Event', eventSchema);
export default Event;
