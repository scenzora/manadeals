import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

/** Public site visitor accounts (distinct from AdminUser). */
const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: "", select: false },
    phone: { type: String, default: "" },
    avatar: { type: String, default: "" },
    provider: { type: String, enum: ["credentials", "google", "facebook"], default: "credentials" },
    favorites: { type: [{ type: Types.ObjectId, ref: "Product" }], default: [] },
    status: { type: String, enum: ["active", "inactive", "blocked"], default: "active", index: true },
    emailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    clickCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

UserSchema.index({ createdAt: -1 });

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) || model<UserDoc>("User", UserSchema);
export default User;
