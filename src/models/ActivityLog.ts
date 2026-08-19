import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

const ActivityLogSchema = new Schema(
  {
    admin: { type: Types.ObjectId, ref: "AdminUser", default: null, index: true },
    adminName: { type: String, default: "" },
    adminEmail: { type: String, default: "" },
    action: {
      type: String,
      enum: ["create", "update", "delete", "login", "logout", "login-failed", "import", "export"],
      required: true,
      index: true,
    },
    module: { type: String, required: true, index: true },
    recordId: { type: String, default: "" },
    description: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    beforeValue: { type: Schema.Types.Mixed, default: null },
    afterValue: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ module: 1, createdAt: -1 });

export type ActivityLogDoc = InferSchemaType<typeof ActivityLogSchema>;

export const ActivityLog: Model<ActivityLogDoc> =
  (models.ActivityLog as Model<ActivityLogDoc>) ||
  model<ActivityLogDoc>("ActivityLog", ActivityLogSchema);
export default ActivityLog;
