// backend/src/controllers/authController.js
import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Calendar from "../models/Calendar.js";
import { generateToken } from "../utils/generateToken.js";
import {
  sendPasswordResetEmail,
  buildPasswordResetLink,
  sendTwoFactorCodeEmail,
  sendEmailVerificationEmail,
  buildEmailVerificationLink,
} from "../utils/email.js";

/** POST /api/auth/register
 * Body: { name, email, password }
 * Creates user, sends email verification, DOES NOT log in yet.
 */
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(400);
    throw new Error("User already exists");
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hashed,
    emailVerified: false,
  });

  // create default calendar
  await Calendar.create({
    userId: user._id,
    name: "Main Calendar",
    color: "#6c6cff",
    owner: user._id,
  });

  // create email verification token
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  user.emailVerificationToken = token;
  user.emailVerificationExpires = expires;
  await user.save();

  const verifyLink = buildEmailVerificationLink(token);
  if (verifyLink) {
    try {
      await sendEmailVerificationEmail({ to: user.email, verifyLink });
    } catch (err) {
      console.error("[auth] Failed to send verification email:", err.message);
    }
  } else {
    console.warn("[auth] APP_URL not set; cannot build verification link.");
  }

  return res.json({
    message:
      "Registration successful. Please check your email to confirm your address before logging in.",
  });
};

/** POST /api/auth/login
 * Body: { email, password }
 * Flow:
 *   - Checks email + password
 *   - Requires emailVerified = true
 *   - Generates email 2FA code and returns { require2FA, userId, message }
 */
export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  const ok = user && (await bcrypt.compare(password, user.password));
  if (!ok) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  if (!user.emailVerified) {
    res.status(403);
    throw new Error("Please verify your email address before logging in.");
  }

  // generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  user.twoFactorLoginCode = code;
  user.twoFactorLoginExpires = expires;
  await user.save();

  try {
    await sendTwoFactorCodeEmail({ to: user.email, code });
  } catch (err) {
    console.error("[auth] Failed to send 2FA email:", err.message);
    // for dev only:
    console.log("[auth] 2FA code for", user.email, "=", code);
  }

  return res.json({
    require2FA: true,
    userId: user._id.toString(),
    message: "Verification code sent to your email.",
  });
};

/** POST /api/auth/2fa/verify
 * Body: { userId, code }
 * Response: { token, user }
 */
export const verifyTwoFactorLogin = async (req, res) => {
  const { userId, code } = req.body;

  if (!userId || !code) {
    res.status(400);
    throw new Error("userId and code are required");
  }

  const user = await User.findById(userId);
  if (!user || !user.twoFactorLoginCode || !user.twoFactorLoginExpires) {
    res.status(400);
    throw new Error("Invalid or expired verification code");
  }

  const now = new Date();
  if (user.twoFactorLoginExpires <= now) {
    user.twoFactorLoginCode = undefined;
    user.twoFactorLoginExpires = undefined;
    await user.save();
    res.status(400);
    throw new Error("Verification code has expired");
  }

  if (user.twoFactorLoginCode !== String(code).trim()) {
    res.status(400);
    throw new Error("Verification code is incorrect");
  }

  user.twoFactorLoginCode = undefined;
  user.twoFactorLoginExpires = undefined;
  await user.save();

  return res.json({ token: generateToken(user), user });
};

/** POST /api/auth/forgot-password
 * Body: { email }
 */
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.json({
      message:
        "If that email is registered, you'll receive a reset link shortly.",
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  user.resetPasswordToken = token;
  user.resetPasswordExpires = expires;
  await user.save();

  const resetLink = buildPasswordResetLink(token);
  if (resetLink) {
    try {
      await sendPasswordResetEmail({ to: user.email, resetLink });
    } catch (err) {
      console.error("[auth] Failed to send reset email:", err.message);
    }
  } else {
    console.warn("[auth] APP_URL not set; cannot build reset link.");
  }

  return res.json({
    message:
      "If that email is registered, you'll receive a reset link shortly.",
  });
};

/** POST /api/auth/reset-password
 * Body: { token, password }
 */
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    res.status(400);
    throw new Error("Token and password are required");
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Reset link is invalid or has expired");
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return res.json({
    message: "Password has been reset. You can now log in.",
  });
};

/** POST /api/auth/verify-email
 * Body: { token }
 * On success returns { token, user } and marks emailVerified = true.
 */
export const verifyEmail = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    res.status(400);
    throw new Error("Verification token is required");
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Email verification link is invalid or has expired");
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return res.json({
    token: generateToken(user),
    user,
  });
};

/** POST /api/auth/resend-verification
 * Body: { email }
 * Always returns 200 with a generic message.
 */
export const resendVerification = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email });

  if (!user || user.emailVerified) {
    // generic response to avoid user enumeration
    return res.json({
      message:
        "If that email is registered and not yet verified, you'll receive a new verification email shortly.",
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  user.emailVerificationToken = token;
  user.emailVerificationExpires = expires;
  await user.save();

  const verifyLink = buildEmailVerificationLink(token);
  if (verifyLink) {
    try {
      await sendEmailVerificationEmail({ to: user.email, verifyLink });
    } catch (err) {
      console.error("[auth] Failed to send verification email:", err.message);
    }
  } else {
    console.warn("[auth] APP_URL not set; cannot build verification link.");
  }

  return res.json({
    message:
      "If that email is registered and not yet verified, you'll receive a new verification email shortly.",
  });
};
