import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

const AdminUserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, default: "" },
    avatar: { type: String, default: "" },
    role: { type: Types.ObjectId, ref: "Role", required: true, index: true },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: "" },
    // Brute-force protection
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    // Password reset
    resetTokenHash: { type: String, default: null, select: false },
    resetTokenExpiresAt: { type: Date, default: null, select: false },
    // Invalidates issued JWTs when bumped (password change / forced logout)
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type AdminUserDoc = InferSchemaType<typeof AdminUserSchema>;

export const AdminUser: Model<AdminUserDoc> =
  (models.AdminUser as Model<AdminUserDoc>) || model<AdminUserDoc>("AdminUser", AdminUserSchema);
export default AdminUser;
