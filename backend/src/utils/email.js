// backend/src/utils/email.js
import nodemailer from "nodemailer";

const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
    APP_URL, // frontend url, e.g. https://chronos.myapp.com
} = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) 
{
    console.warn(
        "[email] SMTP_* env vars are not fully set. Email sending will fail."
    );
}

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465, // true for 465, false for 587/2525/etc
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

/**
 * Send a "you've been invited to calendar" email.
 * This is minimal – no HTML template engine etc.
 */
export async function sendCalendarInviteEmail({
    to,
    calendarName,
    role,
    inviterName,
    inviteLink,
}) 
{
    const subject = `You have been invited to calendar: ${calendarName}`;
    const textLines = [
        `Hi,`,
        ``,
        `${inviterName || "Someone"} has invited you to join the calendar "${calendarName}" as ${role}.`,
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

/**
 * Generate a simple link to the calendar in the frontend app.
 * You can adapt this to your routing structure.
 */
export function buildCalendarInviteLink(calendarId) 
{
    if (!APP_URL) return null;
    // adjust URL shape if your frontend route is different
    return `${APP_URL}/calendar/${calendarId}`;
}

export function buildCalendarInviteAcceptLink(inviteToken) 
{
    if (!APP_URL) return null;
    // Adjust route to match your frontend; this is a common pattern
    return `${APP_URL}/invites/${inviteToken}`;
}
