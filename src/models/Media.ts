import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

/**
 * Catalogue of everything uploaded to Cloudflare R2. The bytes live in R2; this
 * collection is the index that makes them browsable, searchable and deletable
 * from the admin panel.
 */
const MediaSchema = new Schema(
  {
    /** Object key inside the bucket, e.g. "products/2026/08/uuid-name.webp". */
    key: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    filename: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    width: { type: Number, default: null },
    height: { type: Number, default: null },

    /** Logical grouping, mirrors the key prefix. */
    folder: {
      type: String,
      enum: ["products", "categories", "brands", "banners", "blog", "general"],
      default: "general",
      index: true,
    },
    alt: { type: String, default: "" },
    tags: { type: [String], default: [] },

    uploadedBy: { type: Types.ObjectId, ref: "AdminUser", default: null, index: true },
    /**
     * Set once the browser confirms the direct upload finished. Rows that stay
     * pending are abandoned uploads and can be swept.
     */
    status: { type: String, enum: ["pending", "ready"], default: "pending", index: true },
  },
  { timestamps: true },
);

MediaSchema.index({ filename: "text", alt: "text", tags: "text" });
MediaSchema.index({ status: 1, createdAt: -1 });

export type MediaDoc = InferSchemaType<typeof MediaSchema>;

export const Media: Model<MediaDoc> =
  (models.Media as Model<MediaDoc>) || model<MediaDoc>("Media", MediaSchema);
export default Media;
