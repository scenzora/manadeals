import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const RoleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

export type RoleDoc = InferSchemaType<typeof RoleSchema>;

export const Role: Model<RoleDoc> =
  (models.Role as Model<RoleDoc>) || model<RoleDoc>("Role", RoleSchema);
export default Role;
