// backend/src/models/Calendar.js
import mongoose from 'mongoose';
import toJSON from './plugins/toJSON.js';

const calendarSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        color: { type: String, default: '#6c6cff' },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        // share support (optional)
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    { timestamps: true }
);

calendarSchema.plugin(toJSON);

calendarSchema.index({ owner: 1, name: 1 }, { unique: true });

const Calendar = mongoose.model('Calendar', calendarSchema);
export default Calendar;
