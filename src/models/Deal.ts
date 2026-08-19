import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

const DealSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },

    product: { type: Types.ObjectId, ref: "Product", default: null, index: true },
    category: { type: Types.ObjectId, ref: "Category", default: null, index: true },
    affiliateNetwork: { type: Types.ObjectId, ref: "AffiliateNetwork", default: null, index: true },

    dealType: {
      type: String,
      enum: ["standard", "flash", "deal-of-the-day", "featured"],
      default: "standard",
      index: true,
    },
    originalPrice: { type: Number, default: 0, min: 0 },
    dealPrice: { type: Number, default: 0, min: 0 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    couponCode: { type: String, default: "" },
    affiliateUrl: { type: String, default: "" },

    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },

    isFeatured: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ["active", "inactive", "expired"], default: "active", index: true },

    clickCount: { type: Number, default: 0 },
    createdBy: { type: Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true },
);

DealSchema.index({ status: 1, endDate: 1 });

export type DealDoc = InferSchemaType<typeof DealSchema>;

export const Deal: Model<DealDoc> =
  (models.Deal as Model<DealDoc>) || model<DealDoc>("Deal", DealSchema);
export default Deal;
