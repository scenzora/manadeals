import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

const CouponSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    affiliateNetwork: { type: Types.ObjectId, ref: "AffiliateNetwork", default: null, index: true },
    category: { type: Types.ObjectId, ref: "Category", default: null },

    discountType: { type: String, enum: ["percentage", "flat"], default: "percentage" },
    discountValue: { type: Number, default: 0, min: 0 },
    minimumOrderValue: { type: Number, default: 0, min: 0 },
    maximumDiscount: { type: Number, default: 0, min: 0 },

    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true, index: true },
    affiliateUrl: { type: String, default: "" },

    isVerified: { type: Boolean, default: false },
    usageCount: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive", "expired"], default: "active", index: true },
  },
  { timestamps: true },
);

CouponSchema.index({ code: 1, affiliateNetwork: 1 }, { unique: true });

export type CouponDoc = InferSchemaType<typeof CouponSchema>;

export const Coupon: Model<CouponDoc> =
  (models.Coupon as Model<CouponDoc>) || model<CouponDoc>("Coupon", CouponSchema);
export default Coupon;
