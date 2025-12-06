import mongoose from "mongoose";
import toJSON from "./plugins/toJSON.js";

const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Browser subscription object from pushManager.subscribe()
    subscription: {
      endpoint: { type: String, required: true },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
      },
    },
  },
  { timestamps: true }
);

pushSubscriptionSchema.plugin(toJSON);
pushSubscriptionSchema.index(
  { user: 1, "subscription.endpoint": 1 },
  { unique: true }
);

const PushSubscription = mongoose.model(
  "PushSubscription",
  pushSubscriptionSchema
);
export default PushSubscription;
