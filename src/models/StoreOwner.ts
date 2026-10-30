import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

/** A person who runs a white-label store. Separate from AdminUser and from public User. */
const StoreOwnerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    tenant: { type: Types.ObjectId, ref: "Tenant", default: null },
    status: { type: String, enum: ["active", "blocked"], default: "active", index: true },
    /** Bumping this signs the owner out everywhere. */
    tokenVersion: { type: Number, default: 0 },
    failedLogins: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type StoreOwnerDoc = InferSchemaType<typeof StoreOwnerSchema>;

export const StoreOwner: Model<StoreOwnerDoc> =
  (models.StoreOwner as Model<StoreOwnerDoc>) || model<StoreOwnerDoc>("StoreOwner", StoreOwnerSchema);
export default StoreOwner;
