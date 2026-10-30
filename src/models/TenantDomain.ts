import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

/** A custom hostname attached to a tenant. Verification flow lands in phase 4. */
const TenantDomainSchema = new Schema(
  {
    tenant: { type: Types.ObjectId, ref: "Tenant", required: true, index: true },
    hostname: { type: String, required: true, unique: true, lowercase: true, trim: true },
    isPrimary: { type: Boolean, default: false },
    verificationStatus: { type: String, enum: ["pending", "verified", "failed"], default: "pending", index: true },
    sslStatus: { type: String, enum: ["pending", "active", "failed"], default: "pending" },
    verifiedAt: { type: Date, default: null },
    /** Ownership-proof records the provider asked for (usually a TXT), shown in the dashboard. */
    verificationRecords: {
      type: [new Schema({ type: String, domain: String, value: String }, { _id: false })],
      default: [],
    },
    failedChecks: { type: Number, default: 0 },
    lastCheckedAt: { type: Date, default: null },
    lastError: { type: String, default: "" },
  },
  { timestamps: true },
);

export type TenantDomainDoc = InferSchemaType<typeof TenantDomainSchema>;

export const TenantDomain: Model<TenantDomainDoc> =
  (models.TenantDomain as Model<TenantDomainDoc>) ||
  model<TenantDomainDoc>("TenantDomain", TenantDomainSchema);
export default TenantDomain;
