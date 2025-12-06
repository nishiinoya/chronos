// backend/src/utils/email.js
import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, APP_URL } =
  process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
  console.warn(
    "[email] SMTP_* env vars are not fully set. Email sending will fail."
  );
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: Number(SMTP_PORT) === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export async function sendCalendarInviteEmail({
  to,
  calendarName,
  role,
  inviterName,
  inviteLink,
}) {
  const subject = `You have been invited to calendar: ${calendarName}`;
  const textLines = [
    `Hi,`,
    ``,
    `${
      inviterName || "Someone"
    } has invited you to join the calendar "${calendarName}" as ${role}.`,
    ``,
    inviteLink
      ? `Open this link to view the calendar: ${inviteLink}`
      : `Please log in to the app to see the shared calendar.`,
    ``,
    `If you did not expect this email, you can ignore it.`,
  ];

  const mailOptions = {
    from: SMTP_FROM,
    to,
    subject,
    text: textLines.join("\n"),
  };

  await transporter.sendMail(mailOptions);
}

export async function sendPasswordResetEmail({ to, resetLink }) {
  if (!to || !resetLink) {
    throw new Error(
      "sendPasswordResetEmail: 'to' and 'resetLink' are required"
    );
  }

  const subject = "Reset your Chronos password";
  const textLines = [
    "Hi,",
    "",
    "We received a request to reset the password for your Chronos account.",
    "",
    `To choose a new password, open this link: ${resetLink}`,
    "",
    "This link will expire in about 1 hour.",
    "",
    "If you did not request a password reset, you can safely ignore this email.",
  ];

  const mailOptions = {
    from: SMTP_FROM,
    to,
    subject,
    text: textLines.join("\n"),
  };

  await transporter.sendMail(mailOptions);
}

export async function sendTwoFactorCodeEmail({ to, code }) {
  if (!to || !code) {
    throw new Error("sendTwoFactorCodeEmail: 'to' and 'code' are required");
  }

  const subject = "Your Chronos login code";
  const textLines = [
    "Hi,",
    "",
    "Here is your Chronos verification code:",
    "",
    `    ${code}`,
    "",
    "Enter this code in the app to finish logging in.",
    "The code will expire in a few minutes.",
    "",
    "If you did not try to log in, you can ignore this email.",
  ];

  const mailOptions = {
    from: SMTP_FROM,
    to,
    subject,
    text: textLines.join("\n"),
  };

  await transporter.sendMail(mailOptions);
}

export async function sendEmailVerificationEmail({ to, verifyLink }) {
  if (!to || !verifyLink) {
    throw new Error(
      "sendEmailVerificationEmail: 'to' and 'verifyLink' are required"
    );
  }

  const subject = "Confirm your Chronos email address";
  const textLines = [
    "Hi,",
    "",
    "Welcome to Chronos!",
    "",
    "To activate your account, please confirm your email address by opening this link:",
    "",
    `    ${verifyLink}`,
    "",
    "If you did not create a Chronos account, you can ignore this email.",
  ];

  const mailOptions = {
    from: SMTP_FROM,
    to,
    subject,
    text: textLines.join("\n"),
  };

  await transporter.sendMail(mailOptions);
}

export function buildCalendarInviteLink(calendarId) {
  if (!APP_URL) return null;
  return `${APP_URL}/calendar/${calendarId}`;
}

export function buildCalendarInviteAcceptLink(inviteToken) {
  if (!APP_URL) return null;
  return `${APP_URL}/invites/${inviteToken}`;
}

export function buildPasswordResetLink(token) {
  if (!APP_URL) return null;
  return `${APP_URL}/reset-password?token=${token}`;
}

export function buildEmailVerificationLink(token) {
  if (!APP_URL) return null;
  return `${APP_URL}/verify-email?token=${token}`;
}
