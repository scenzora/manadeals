import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

const BannerSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "" },
    desktopImage: { type: String, default: "" },
    mobileImage: { type: String, default: "" },
    ctaText: { type: String, default: "" },
    ctaUrl: { type: String, default: "" },
    position: {
      type: String,
      enum: ["home-hero", "home-middle", "category-top", "sidebar", "footer"],
      default: "home-hero",
      index: true,
    },
    priority: { type: Number, default: 0, index: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    createdBy: { type: Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true },
);

BannerSchema.index({ position: 1, priority: -1 });

export type BannerDoc = InferSchemaType<typeof BannerSchema>;

export const Banner: Model<BannerDoc> =
  (models.Banner as Model<BannerDoc>) || model<BannerDoc>("Banner", BannerSchema);
export default Banner;
