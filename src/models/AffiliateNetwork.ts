import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const AffiliateNetworkSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo: { type: String, default: "" },
    /** Affiliate/tracking id, e.g. an Amazon associate tag. Server-side only. */
    trackingId: { type: String, default: "", select: false },
    /** Optional API credentials, never returned to the browser. */
    apiKey: { type: String, default: "", select: false },
    apiSecret: { type: String, default: "", select: false },
    baseUrl: { type: String, default: "" },
    /** e.g. "{url}?tag={trackingId}" — {url} and {trackingId} are substituted. */
    affiliateUrlPattern: { type: String, default: "" },
    commissionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  },
  { timestamps: true },
);

export type AffiliateNetworkDoc = InferSchemaType<typeof AffiliateNetworkSchema>;

export const AffiliateNetwork: Model<AffiliateNetworkDoc> =
  (models.AffiliateNetwork as Model<AffiliateNetworkDoc>) ||
  model<AffiliateNetworkDoc>("AffiliateNetwork", AffiliateNetworkSchema);
export default AffiliateNetwork;
