import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

/**
 * Internal knowledge base. Unlike BlogPost these pages are never published to
 * the storefront: they document how the team runs ManaDeals (processes,
 * conventions, runbooks) and are only readable inside the admin panel.
 */
const WikiPageSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    section: {
      type: String,
      enum: [
        "getting-started",
        "catalogue",
        "offers",
        "analytics",
        "content",
        "administration",
        "operations",
        "troubleshooting",
      ],
      default: "getting-started",
      index: true,
    },
    excerpt: { type: String, default: "" },
    /** Markdown, rendered by lib/utils/markdown.ts (HTML is escaped first). */
    content: { type: String, default: "" },
    tags: { type: [String], default: [], index: true },
    order: { type: Number, default: 0, index: true },
    isPinned: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ["draft", "published"], default: "published", index: true },

    author: { type: Types.ObjectId, ref: "AdminUser", default: null },
    updatedBy: { type: Types.ObjectId, ref: "AdminUser", default: null },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

WikiPageSchema.index({ title: "text", content: "text", excerpt: "text" });
WikiPageSchema.index({ section: 1, order: 1 });

export type WikiPageDoc = InferSchemaType<typeof WikiPageSchema>;

export const WikiPage: Model<WikiPageDoc> =
  (models.WikiPage as Model<WikiPageDoc>) || model<WikiPageDoc>("WikiPage", WikiPageSchema);
export default WikiPage;
