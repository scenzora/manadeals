import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

/** A blog post written by a store owner. Always read through `scoped()`. */
const StoreBlogPostSchema = new Schema(
  {
    tenant: { type: Types.ObjectId, ref: "Tenant", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    excerpt: { type: String, default: "", maxlength: 300 },
    content: { type: String, default: "", maxlength: 50_000 },
    featuredImage: { type: String, default: "" },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    publishedAt: { type: Date, default: null },
    readingMinutes: { type: Number, default: 1 },
  },
  { timestamps: true },
);

StoreBlogPostSchema.index({ tenant: 1, slug: 1 }, { unique: true });
StoreBlogPostSchema.index({ tenant: 1, status: 1, publishedAt: -1 });

export type StoreBlogPostDoc = InferSchemaType<typeof StoreBlogPostSchema>;

export const StoreBlogPost: Model<StoreBlogPostDoc> =
  (models.StoreBlogPost as Model<StoreBlogPostDoc>) ||
  model<StoreBlogPostDoc>("StoreBlogPost", StoreBlogPostSchema);
export default StoreBlogPost;
