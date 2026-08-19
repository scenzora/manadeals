import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

const ProductViewSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: "Product", required: true, index: true },
    category: { type: Types.ObjectId, ref: "Category", default: null, index: true },
    user: { type: Types.ObjectId, ref: "User", default: null },
    sessionId: { type: String, default: "" },
    device: { type: String, enum: ["desktop", "mobile", "tablet", "unknown"], default: "unknown" },
    browser: { type: String, default: "" },
    country: { type: String, default: "" },
    referrer: { type: String, default: "" },
    viewedAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: false },
);

ProductViewSchema.index({ product: 1, viewedAt: -1 });

export type ProductViewDoc = InferSchemaType<typeof ProductViewSchema>;

export const ProductView: Model<ProductViewDoc> =
  (models.ProductView as Model<ProductViewDoc>) ||
  model<ProductViewDoc>("ProductView", ProductViewSchema);
export default ProductView;
