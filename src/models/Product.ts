import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";
import { calculateDiscountPercentage } from "@/lib/utils/format";

/** A product can be sold through several affiliate networks at once. */
const AffiliateLinkSchema = new Schema(
  {
    network: { type: Types.ObjectId, ref: "AffiliateNetwork", required: true },
    affiliateUrl: { type: String, required: true, trim: true },
    trackingUrl: { type: String, default: "" },
    externalProductId: { type: String, default: "" }, // ASIN / FSN / etc.
    price: { type: Number, default: null, min: 0 },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false },
);

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    shortDescription: { type: String, default: "" },
    description: { type: String, default: "" },

    category: { type: Types.ObjectId, ref: "Category", required: true, index: true },
    subcategory: { type: Types.ObjectId, ref: "Category", default: null, index: true },
    brand: { type: Types.ObjectId, ref: "Brand", default: null, index: true },

    thumbnail: { type: String, default: "" },
    images: { type: [String], default: [] },

    originalPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100, index: true },
    currency: { type: String, default: "INR" },

    affiliateLinks: { type: [AffiliateLinkSchema], default: [] },
    sku: { type: String, default: "", index: true },

    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    availability: {
      type: String,
      enum: ["in-stock", "out-of-stock", "limited", "pre-order"],
      default: "in-stock",
      index: true,
    },

    isFeatured: { type: Boolean, default: false, index: true },
    isTrending: { type: Boolean, default: false, index: true },
    isDealOfTheDay: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ["active", "inactive", "draft"], default: "active", index: true },

    // Denormalised counters kept in sync by the analytics service.
    viewCount: { type: Number, default: 0, index: true },
    clickCount: { type: Number, default: 0, index: true },
    popularityScore: { type: Number, default: 0, index: true },

    lowestPrice: { type: Number, default: null },
    highestPrice: { type: Number, default: null },

    seo: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      keywords: { type: [String], default: [] },
    },

    createdBy: { type: Types.ObjectId, ref: "AdminUser", default: null },
    updatedBy: { type: Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true },
);

ProductSchema.index({ name: "text", shortDescription: "text", description: "text" });
ProductSchema.index({ status: 1, createdAt: -1 });
ProductSchema.index({ category: 1, status: 1, salePrice: 1 });

/** Discount is always derived from prices, never trusted from the client. */
function syncDerivedPricing(this: Record<string, unknown>) {
  const originalPrice = Number(this.originalPrice ?? 0);
  const salePrice = Number(this.salePrice ?? 0);
  this.discountPercentage = calculateDiscountPercentage(originalPrice, salePrice);
  const lowest = this.lowestPrice as number | null;
  const highest = this.highestPrice as number | null;
  this.lowestPrice = lowest == null ? salePrice : Math.min(lowest, salePrice);
  this.highestPrice = highest == null ? salePrice : Math.max(highest, salePrice);
}

ProductSchema.pre("save", syncDerivedPricing);

export type ProductDoc = InferSchemaType<typeof ProductSchema>;

export const Product: Model<ProductDoc> =
  (models.Product as Model<ProductDoc>) || model<ProductDoc>("Product", ProductSchema);
export default Product;
