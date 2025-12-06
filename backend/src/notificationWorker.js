// backend/src/notificationWorker.js
import "dotenv/config";
import nodemailer from "nodemailer";
import webpush from "web-push";
import PushSubscription from "./models/PushSubscription.js";
import { connectDB } from "./db.js";
import Notification from "./models/Notification.js";
import Event from "./models/Event.js";
import User from "./models/User.js";

const POLL_INTERVAL_MS = 15_000; // 15 seconds

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn("[notifier] SMTP env vars not fully set, email will fail.");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

async function processDueNotifications(transporter) {
  const now = new Date();

  const due = await Notification.find({
    status: "pending",
    sendAt: { $lte: now },
  })
    .limit(50)
    .populate("event")
    .populate("user");

  if (!due.length) return;

  console.log(`[notifier] Found ${due.length} due notifications`);

  for (const n of due) {
    try {
      if (!n.event || !n.user) {
        n.status = "failed";
        n.error = "Missing populated event/user";
        await n.save();
        continue;
      }

      const evt = n.event;
      const user = n.user;

      console.log(n.channel, "notification for user", user._id.toString());
      if (n.channel === "email") {
        const evt = n.event;
        const user = n.user;

        const when =
          evt.type === "reminder" && evt.reminderAt
            ? evt.reminderAt
            : evt.start || evt.dueDate;

        // Very simple email content; customize as you like
        const textLines = [
          `Hi ${user.name || ""}`.trim() + ",",
          "",
          `This is a reminder for: ${evt.title}`,
          evt.location ? `Where: ${evt.location}` : "",
          evt.description ? `Details: ${evt.description}` : "",
          "",
          "— Chronos",
        ].filter(Boolean);

        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: user.email,
          subject: `[Chronos] Reminder: ${evt.title}`,
          text: textLines.join("\n"),
        });

        console.log("[notifier] Email sent for notification", n._id.toString());
      }

      if (n.channel === "browser") {
        const subs = await PushSubscription.find({ user: user._id });

        if (!subs.length) {
          console.log(
            "[notifier] No push subscriptions for user",
            user._id.toString()
          );
        }

        const payload = JSON.stringify({
          title: `Reminder: ${evt.title}`,
          body: evt.description || "You have an upcoming event.",
          data: {
            eventId: evt._id,
            type: evt.type,
          },
        });

        for (const s of subs) {
          try {
            await webpush.sendNotification(s.subscription, payload);
            console.log(
              "[notifier] Webpush sent for notification",
              n._id.toString(),
              "to subscription",
              s._id.toString()
            );
          } catch (err) {
            console.error(
              "[notifier] webpush error:",
              err.statusCode,
              err.body
            );
            // If endpoint is gone, clean it up
            if (err.statusCode === 410 || err.statusCode === 404) {
              await PushSubscription.deleteOne({ _id: s._id });
            }
          }
        }
      }

      n.status = "sent";
      n.sentAt = new Date();
      n.error = null;
      await n.save();
    } catch (err) {
      console.error(
        "[notifier] Failed to send notification",
        n._id.toString(),
        err
      );
      n.status = "failed";
      n.error = err.message;
      await n.save();
    }
  }
}

async function main() {
  await connectDB(process.env.MONGODB_URI);
  const transporter = createTransporter();

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  console.log(
    "⏰ Notification worker started; polling every",
    POLL_INTERVAL_MS,
    "ms"
  );

  setInterval(() => {
    processDueNotifications(transporter).catch((err) =>
      console.error("[notifier] Error in processDueNotifications:", err)
    );
  }, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error("[notifier] Fatal:", err);
  process.exit(1);
});
