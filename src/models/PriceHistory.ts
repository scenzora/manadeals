import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

/**
 * One row per observed price change. Written by the admin UI today and by an
 * automated price-update service later; the shape does not need to change.
 */
const PriceHistorySchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: "Product", required: true, index: true },
    affiliateNetwork: { type: Types.ObjectId, ref: "AffiliateNetwork", default: null },
    previousPrice: { type: Number, default: null, min: 0 },
    currentPrice: { type: Number, required: true, min: 0 },
    priceChange: { type: Number, default: 0 },
    changePercentage: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    source: { type: String, enum: ["manual", "api", "scraper"], default: "manual" },
    recordedAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true },
);

PriceHistorySchema.index({ product: 1, recordedAt: -1 });

export type PriceHistoryDoc = InferSchemaType<typeof PriceHistorySchema>;

export const PriceHistory: Model<PriceHistoryDoc> =
  (models.PriceHistory as Model<PriceHistoryDoc>) ||
  model<PriceHistoryDoc>("PriceHistory", PriceHistorySchema);
export default PriceHistory;
