import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const BrandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo: { type: String, default: "" },
    description: { type: String, default: "" },
    website: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    seo: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      keywords: { type: [String], default: [] },
    },
  },
  { timestamps: true },
);

export type BrandDoc = InferSchemaType<typeof BrandSchema>;

export const Brand: Model<BrandDoc> =
  (models.Brand as Model<BrandDoc>) || model<BrandDoc>("Brand", BrandSchema);
export default Brand;
