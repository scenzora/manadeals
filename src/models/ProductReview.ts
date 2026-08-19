import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

const ProductReviewSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: "Product", required: true, index: true },
    user: { type: Types.ObjectId, ref: "User", default: null, index: true },
    authorName: { type: String, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5, index: true },
    title: { type: String, default: "" },
    comment: { type: String, default: "" },
    images: { type: [String], default: [] },
    source: { type: String, enum: ["site", "amazon", "flipkart", "imported"], default: "site" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    moderatedBy: { type: Types.ObjectId, ref: "AdminUser", default: null },
    moderatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ProductReviewSchema.index({ product: 1, status: 1, createdAt: -1 });

export type ProductReviewDoc = InferSchemaType<typeof ProductReviewSchema>;

export const ProductReview: Model<ProductReviewDoc> =
  (models.ProductReview as Model<ProductReviewDoc>) ||
  model<ProductReviewDoc>("ProductReview", ProductReviewSchema);
export default ProductReview;
