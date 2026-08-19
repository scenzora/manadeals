import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

const BlogPostSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    excerpt: { type: String, default: "" },
    content: { type: String, default: "" },
    featuredImage: { type: String, default: "" },
    author: { type: Types.ObjectId, ref: "AdminUser", required: true, index: true },
    categories: { type: [{ type: Types.ObjectId, ref: "Category" }], default: [] },
    tags: { type: [String], default: [], index: true },
    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "archived"],
      default: "draft",
      index: true,
    },
    publishedAt: { type: Date, default: null, index: true },
    readingMinutes: { type: Number, default: 1 },
    viewCount: { type: Number, default: 0 },
    seo: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      keywords: { type: [String], default: [] },
      ogImage: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

BlogPostSchema.index({ status: 1, publishedAt: -1 });

export type BlogPostDoc = InferSchemaType<typeof BlogPostSchema>;

export const BlogPost: Model<BlogPostDoc> =
  (models.BlogPost as Model<BlogPostDoc>) || model<BlogPostDoc>("BlogPost", BlogPostSchema);
export default BlogPost;
