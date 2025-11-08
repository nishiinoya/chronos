// backend/src/models/User.js
import mongoose from 'mongoose';
import toJSON from './plugins/toJSON.js';

const userSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, required: true, minlength: 2, maxlength: 120 },
        email: { type: String, trim: true, lowercase: true, unique: true, required: true, index: true },
        password: { type: String, required: true }, // store hash, not raw password
        // optional:
        avatarUrl: { type: String },
        role: { type: String, enum: ['user', 'admin'], default: 'user' },
    },
    { timestamps: true }
);

// normalize output: adds "id", removes "_id" and "__v"
userSchema.plugin(toJSON);

// helpful virtual if you need: user.calendars (not populated by default)
userSchema.virtual('calendars', {
    ref: 'Calendar',
    localField: '_id',
    foreignField: 'owner',
});

userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);
export default User;
