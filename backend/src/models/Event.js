// backend/src/models/Event.js
import mongoose from 'mongoose';
import toJSON from './plugins/toJSON.js';

const eventSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        start: { type: Date, required: true, index: true },
        end:   { type: Date, required: true, index: true },
        allDay: { type: Boolean, default: false },

        calendarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Calendar', required: true, index: true },
        owner:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

        location: { type: String, trim: true },
        description: { type: String, trim: true },

        // optional extras
        recurrence: {
            freq: { type: String, enum: ['DAILY','WEEKLY','MONTHLY','YEARLY'], default: undefined },
            interval: { type: Number },
            byweekday: [{ type: Number }], // 0..6
        },
    },
    { timestamps: true }
);

eventSchema.plugin(toJSON);

// Practical indexes for range queries and calendar filters
eventSchema.index({ calendarId: 1, start: 1 });
eventSchema.index({ owner: 1, start: 1 });

const Event = mongoose.model('Event', eventSchema);
export default Event;
