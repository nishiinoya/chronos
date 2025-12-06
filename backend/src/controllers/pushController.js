import PushSubscription from "../models/PushSubscription.js";

/**
 * POST /api/notifications/subscribe
 * body: { subscription }
 * auth: user must be logged in (use your existing auth middleware)
 */
export const saveSubscription = async (req, res) => {
  try {
    const userId = req.user.id; // or req.user._id depending on your auth
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ message: "Invalid subscription" });
    }

    await PushSubscription.findOneAndUpdate(
      {
        user: userId,
        "subscription.endpoint": subscription.endpoint,
      },
      {
        user: userId,
        subscription,
      },
      { upsert: true, new: true }
    );

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("saveSubscription error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
