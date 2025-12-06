// backend/src/models/User.js
import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true,
      index: true,
    },
    password: { type: String, required: true }, // hashed password
    avatarUrl: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },

    // password reset
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    // login 2FA (simple email code per login)
    twoFactorLoginCode: { type: String },
    twoFactorLoginExpires: { type: Date },

    // email confirmation
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
  },
  { timestamps: true }
);

// normalize JSON output: adds "id", removes "_id" and "__v"
userSchema.plugin(toJSON);

// calendars relation (if you use populate)
userSchema.virtual("calendars", {
  ref: "Calendar",
  localField: "_id",
  foreignField: "owner",
});

userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);
export default User;
