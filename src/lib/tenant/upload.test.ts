import { describe, expect, it } from "vitest";

import { checkBrandImage, MAX_BRAND_IMAGE_BYTES } from "@/lib/tenant/upload";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new TextEncoder().encode(value);

const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0);
const WEBP = bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50);

describe("checkBrandImage", () => {
  it("accepts PNG, WebP and plain SVG by content", () => {
    expect(checkBrandImage(PNG)).toMatchObject({ ok: true, extension: "png" });
    expect(checkBrandImage(WEBP)).toMatchObject({ ok: true, extension: "webp" });
    expect(checkBrandImage(text('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'))).toMatchObject({
      ok: true,
      extension: "svg",
    });
    expect(checkBrandImage(text('<?xml version="1.0"?>\n<svg width="1"></svg>')).ok).toBe(true);
  });

  it("rejects other formats regardless of declared type", () => {
    expect(checkBrandImage(bytes(0xff, 0xd8, 0xff, 0xe0)).ok).toBe(false); // JPEG
    expect(checkBrandImage(text("GIF89a....")).ok).toBe(false);
    expect(checkBrandImage(text("<html><body>hi</body></html>")).ok).toBe(false);
  });

  it("rejects SVGs that carry script or embedded content", () => {
    for (const payload of [
      '<svg><script>alert(1)</script></svg>',
      '<svg onload="alert(1)"></svg>',
      '<svg><foreignObject><div/></foreignObject></svg>',
      '<svg><a href="javascript:alert(1)"><rect/></a></svg>',
    ]) {
      expect(checkBrandImage(text(payload)).ok).toBe(false);
    }
  });

  it("enforces the size limit and rejects empty files", () => {
    expect(checkBrandImage(new Uint8Array(0)).ok).toBe(false);
    const big = new Uint8Array(MAX_BRAND_IMAGE_BYTES + 1);
    big.set(PNG);
    expect(checkBrandImage(big).ok).toBe(false);
  });
});
