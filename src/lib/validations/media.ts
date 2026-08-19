import { z } from "zod";

import { objectId } from "./common";

export const MEDIA_FOLDERS = [
  { value: "products", label: "Products" },
  { value: "categories", label: "Categories" },
  { value: "brands", label: "Brands" },
  { value: "banners", label: "Banners" },
  { value: "blog", label: "Blog" },
  { value: "general", label: "General" },
] as const;

export const mediaFolderSchema = z.enum([
  "products",
  "categories",
  "brands",
  "banners",
  "blog",
  "general",
]);

/** Only web-deliverable image types are accepted. */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
] as const;

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

export const presignSchema = z.object({
  filename: z.string().min(1, "Filename is required").max(200),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    message: "Only JPEG, PNG, WebP, AVIF, GIF and SVG images are allowed",
  }),
  size: z
    .number()
    .int()
    .min(1, "File is empty")
    .max(MAX_UPLOAD_BYTES, "Files must be 8 MB or smaller"),
  folder: mediaFolderSchema.default("general"),
});

export const confirmUploadSchema = z.object({
  id: objectId,
  width: z.number().int().min(0).nullable().default(null),
  height: z.number().int().min(0).nullable().default(null),
});

export const mediaUpdateSchema = z.object({
  alt: z.string().max(200).default(""),
  tags: z.array(z.string().max(40)).max(20).default([]),
});

export type PresignInput = z.input<typeof presignSchema>;
export type PresignValues = z.output<typeof presignSchema>;
export type MediaFolder = z.infer<typeof mediaFolderSchema>;
