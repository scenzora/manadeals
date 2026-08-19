import crypto from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import Media from "@/models/Media";
import { getR2Client, keyFromPublicUrl, publicUrlForKey, R2_BUCKET } from "@/lib/r2";
import { slugify } from "@/lib/utils/slug";
import type { MediaFolder } from "@/lib/validations/media";

const PRESIGN_TTL_SECONDS = 300;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

/**
 * Builds a collision-proof, readable object key:
 *   products/2026/08/lg-washing-machine-8f3a2c1d.webp
 *
 * The random suffix means an upload can never overwrite an existing object, and
 * keys cannot be guessed by enumerating names.
 */
export function buildObjectKey(filename: string, mimeType: string, folder: MediaFolder) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const base = slugify(filename.replace(/\.[^.]+$/, "")).slice(0, 60) || "file";
  const extension = EXTENSIONS[mimeType] ?? "bin";
  const suffix = crypto.randomBytes(4).toString("hex");

  return `${folder}/${year}/${month}/${base}-${suffix}.${extension}`;
}

/**
 * Issues a short-lived presigned PUT URL so the browser uploads straight to R2.
 * Bytes never pass through the app, which sidesteps serverless body limits and
 * keeps upload bandwidth off the origin.
 */
export async function createUploadUrl(input: {
  filename: string;
  mimeType: string;
  size: number;
  folder: MediaFolder;
  adminId: string;
}) {
  const key = buildObjectKey(input.filename, input.mimeType, input.folder);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: input.mimeType,
    ContentLength: input.size,
  });

  const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: PRESIGN_TTL_SECONDS });
  const url = publicUrlForKey(key);

  // Recorded as "pending" up front so an interrupted upload leaves a trace that
  // can be swept, rather than an orphaned object nobody knows about.
  const media = await Media.create({
    key,
    url,
    filename: input.filename.slice(0, 200),
    mimeType: input.mimeType,
    size: input.size,
    folder: input.folder,
    uploadedBy: input.adminId,
    status: "pending",
  });

  return { id: String(media._id), key, url, uploadUrl, expiresIn: PRESIGN_TTL_SECONDS };
}

/** Deletes the object from R2, then the row. Never leaves the row behind. */
export async function deleteMedia(id: string) {
  const media = await Media.findById(id).lean();
  if (!media) return null;

  try {
    await getR2Client().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: media.key }));
  } catch (error) {
    // A missing object should not block cleaning up the catalogue entry.
    console.error("[media] R2 delete failed", media.key, error);
  }

  await Media.findByIdAndDelete(id);
  return media;
}

/**
 * Counts how many catalogue records still reference a URL, so the UI can warn
 * before deleting an image that is live on the storefront.
 */
export async function countReferences(url: string) {
  const [{ default: Product }, { default: Category }, { default: Brand }, { default: Banner }, { default: BlogPost }] =
    await Promise.all([
      import("@/models/Product"),
      import("@/models/Category"),
      import("@/models/Brand"),
      import("@/models/Banner"),
      import("@/models/BlogPost"),
    ]);

  const [products, categories, brands, banners, posts] = await Promise.all([
    Product.countDocuments({ $or: [{ thumbnail: url }, { images: url }] }),
    Category.countDocuments({ image: url }),
    Brand.countDocuments({ logo: url }),
    Banner.countDocuments({ $or: [{ desktopImage: url }, { mobileImage: url }] }),
    BlogPost.countDocuments({ featuredImage: url }),
  ]);

  return products + categories + brands + banners + posts;
}

export { keyFromPublicUrl };
