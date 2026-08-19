import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

/**
 * In-app admin notifications. Channels other than "in-app" (email, telegram,
 * whatsapp) are stored the same way so a future dispatcher can pick them up.
 */
const NotificationSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, default: "" },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error", "price-drop", "system"],
      default: "info",
      index: true,
    },
    channel: {
      type: String,
      enum: ["in-app", "email", "telegram", "whatsapp"],
      default: "in-app",
      index: true,
    },
    /** null = broadcast to every admin. */
    recipient: { type: Types.ObjectId, ref: "AdminUser", default: null, index: true },
    link: { type: String, default: "" },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export type NotificationDoc = InferSchemaType<typeof NotificationSchema>;

export const Notification: Model<NotificationDoc> =
  (models.Notification as Model<NotificationDoc>) ||
  model<NotificationDoc>("Notification", NotificationSchema);
export default Notification;
