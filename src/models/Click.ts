import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

/** One outbound affiliate click. High-write collection; keep it lean. */
const ClickSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: "Product", default: null, index: true },
    deal: { type: Types.ObjectId, ref: "Deal", default: null },
    coupon: { type: Types.ObjectId, ref: "Coupon", default: null },
    category: { type: Types.ObjectId, ref: "Category", default: null, index: true },
    affiliateNetwork: { type: Types.ObjectId, ref: "AffiliateNetwork", default: null, index: true },
    user: { type: Types.ObjectId, ref: "User", default: null, index: true },

    sessionId: { type: String, default: "" },
    device: { type: String, enum: ["desktop", "mobile", "tablet", "unknown"], default: "unknown" },
    browser: { type: String, default: "" },
    os: { type: String, default: "" },
    country: { type: String, default: "" },
    city: { type: String, default: "" },
    referrer: { type: String, default: "" },
    ipHash: { type: String, default: "" },

    /** Commission attributed to this click, used for revenue estimates. */
    estimatedRevenue: { type: Number, default: 0 },
    converted: { type: Boolean, default: false, index: true },

    clickedAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: false },
);

ClickSchema.index({ clickedAt: -1, affiliateNetwork: 1 });
ClickSchema.index({ product: 1, clickedAt: -1 });

export type ClickDoc = InferSchemaType<typeof ClickSchema>;

export const Click: Model<ClickDoc> =
  (models.Click as Model<ClickDoc>) || model<ClickDoc>("Click", ClickSchema);
export default Click;
