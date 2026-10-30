/**
 * Validation for store logos and favicons. Content is sniffed from the bytes,
 * never trusted from the declared MIME type or file name.
 */
export const MAX_BRAND_IMAGE_BYTES = 1024 * 1024;

export type BrandImageKind = "image/png" | "image/webp" | "image/svg+xml";

export type ImageCheck = { ok: true; mime: BrandImageKind; extension: "png" | "webp" | "svg" } | { ok: false; reason: string };

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((value, index) => bytes[offset + index] === value);

export function checkBrandImage(bytes: Uint8Array): ImageCheck {
  if (bytes.length === 0) return { ok: false, reason: "The file is empty" };
  if (bytes.length > MAX_BRAND_IMAGE_BYTES) return { ok: false, reason: "Images must be 1 MB or smaller" };

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ok: true, mime: "image/png", extension: "png" };
  }
  // RIFF....WEBP
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { ok: true, mime: "image/webp", extension: "webp" };
  }

  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 64 * 1024)).trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!doctype svg[^>]*>\s*)?<svg[\s>]/i.test(head)) {
    const text = new TextDecoder().decode(bytes);
    // SVG can carry script; the file is only ever shown via <img>, but reject the
    // dangerous constructs outright so it is safe even if opened directly.
    if (/<script|<foreignObject|\son\w+\s*=|javascript:|<iframe|<embed|<object|<!ENTITY/i.test(text)) {
      return { ok: false, reason: "SVG files may not contain scripts or embedded content" };
    }
    return { ok: true, mime: "image/svg+xml", extension: "svg" };
  }

  return { ok: false, reason: "Only PNG, WebP and SVG images are allowed" };
}
