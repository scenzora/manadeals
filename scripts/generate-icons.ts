/**
 * Generates every brand asset the app needs from the two source logo files.
 *
 *   npm run icons
 *
 * Sources (override with LOGO_WIDE / LOGO_SQUARE env vars):
 *   - a wide wordmark lockup  → header, login, OG image
 *   - a square stacked lockup → cropped to the bag mark for icons and favicons
 *
 * Re-run this whenever the logo changes; nothing here is hand-edited.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SOURCE_WIDE = process.env.LOGO_WIDE ?? "G:/Personal/Mana Deals/Mana Deals.png";
const SOURCE_SQUARE = process.env.LOGO_SQUARE ?? "G:/Personal/Mana Deals/Mana Deals-square.png";

const ROOT = path.resolve(import.meta.dirname, "..");

/**
 * Images are served unoptimized (see next.config.ts), so everything here is
 * emitted at the size it is actually displayed at — roughly 2x the largest
 * on-screen height — and palette-compressed.
 */
const PNG_OUTPUT = { palette: true, quality: 90, effort: 10, compressionLevel: 9 } as const;
const PUBLIC_DIR = path.join(ROOT, "public");
const APP_DIR = path.join(ROOT, "src", "app");

/** Navy from the brand palette, used where transparency is not allowed. */
const NAVY = { r: 16, g: 42, b: 67, alpha: 1 };

/**
 * Trims transparent margin in its own pass. sharp reorders `trim()` and
 * `extract()` when they are chained on one instance, which makes crop
 * coordinates meaningless, so every crop below works from a trimmed buffer.
 */
async function trimmed(source: string) {
  return sharp(source).trim({ threshold: 10 }).png().toBuffer();
}

/**
 * The square lockup stacks the bag mark above the wordmark. Only the mark is
 * legible at favicon sizes, so crop the top portion and trim the leftover
 * transparent margin.
 */
async function extractMark() {
  const base = await trimmed(SOURCE_SQUARE);
  const { width = 0, height = 0 } = await sharp(base).metadata();

  const cropped = await sharp(base)
    .extract({
      left: Math.round(width * 0.2),
      top: Math.round(height * 0.02),
      width: Math.round(width * 0.66),
      height: Math.round(height * 0.535),
    })
    .png()
    .toBuffer();

  return sharp(cropped).trim({ threshold: 10 }).png().toBuffer();
}

/**
 * The full lockup carries a tagline and a ".online" badge that turn to mud
 * below ~60px, but the tagline sits *above* the bottom of the bag, so it cannot
 * simply be cropped off. Instead, recompose a compact lockup from two clean
 * pieces: the extracted bag mark and the wordmark lifted out of the wide art.
 */
async function buildCompactLockup(mark: Buffer) {
  const base = await trimmed(SOURCE_WIDE);
  const { width = 0, height = 0 } = await sharp(base).metadata();

  const wordmarkCrop = await sharp(base)
    .extract({
      left: Math.round(width * 0.27),
      top: Math.round(height * 0.24),
      width: Math.round(width * 0.72),
      height: Math.round(height * 0.36),
    })
    .png()
    .toBuffer();

  const wordmark = await sharp(wordmarkCrop).trim({ threshold: 10 }).png().toBuffer();

  const CANVAS_HEIGHT = 240;
  const MARK_HEIGHT = Math.round(CANVAS_HEIGHT * 0.92); // keeps the bag off the edge

  const sizedMark = await sharp(mark)
    .resize({ height: MARK_HEIGHT, withoutEnlargement: false })
    .toBuffer();

  // Keeps the wordmark-to-mark proportion of the original artwork.
  const sizedWord = await sharp(wordmark)
    .resize({ height: Math.round(MARK_HEIGHT * 0.5), withoutEnlargement: false })
    .toBuffer();

  const markMeta = await sharp(sizedMark).metadata();
  const wordMeta = await sharp(sizedWord).metadata();
  const gap = Math.round(CANVAS_HEIGHT * 0.05);

  const canvasWidth = (markMeta.width ?? 0) + gap + (wordMeta.width ?? 0);

  // Composited first, then resized in a separate pass: sharp applies resize
  // before composite when they are chained, which breaks the overlay bounds.
  const composed = await sharp({
    create: {
      width: canvasWidth,
      height: CANVAS_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: sizedMark, left: 0, top: Math.round((CANVAS_HEIGHT - (markMeta.height ?? 0)) / 2) },
      {
        input: sizedWord,
        left: (markMeta.width ?? 0) + gap,
        top: Math.round((CANVAS_HEIGHT - (wordMeta.height ?? 0)) / 2),
      },
    ])
    .png()
    .toBuffer();

  return sharp(composed)
    .resize({ width: 600, withoutEnlargement: true }) // displayed at most 40px tall
    .png(PNG_OUTPUT)
    .toBuffer();
}

/** Pads a buffer into a square canvas of `size`, keeping the aspect ratio. */
async function squareIcon(mark: Buffer, size: number, background = { r: 0, g: 0, b: 0, alpha: 0 }) {
  const inner = Math.round(size * 0.86); // a little breathing room inside the tile

  return sharp(mark)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: Math.round((size - inner) / 2),
      bottom: size - inner - Math.round((size - inner) / 2),
      left: Math.round((size - inner) / 2),
      right: size - inner - Math.round((size - inner) / 2),
      background,
    })
    .png(PNG_OUTPUT)
    .toBuffer();
}

/**
 * Wraps PNGs in an ICO container. Every modern browser reads PNG-in-ICO, which
 * avoids hand-rolling a BMP encoder.
 */
function buildIco(images: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries: Buffer[] = [];
  let offset = 6 + images.length * 16;

  for (const image of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(image.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += image.data.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

async function main() {
  for (const file of [SOURCE_WIDE, SOURCE_SQUARE]) {
    await fs.access(file).catch(() => {
      throw new Error(`Source logo not found: ${file}`);
    });
  }

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  const written: string[] = [];

  const record = async (target: string, data: Buffer) => {
    await fs.writeFile(target, data);
    written.push(`${path.relative(ROOT, target)} (${(data.length / 1024).toFixed(1)} KB)`);
  };

  // 1. Wide wordmark for headers and the login screen.
  const wide = await sharp(await trimmed(SOURCE_WIDE))
    .resize({ width: 560, withoutEnlargement: true }) // displayed at most 64px tall
    .png(PNG_OUTPUT)
    .toBuffer();
  await record(path.join(PUBLIC_DIR, "logo.png"), wide);

  // 2. Square mark, used anywhere the slot is square.
  const mark = await extractMark();
  await record(path.join(PUBLIC_DIR, "logo-mark.png"), await squareIcon(mark, 256));

  // 3. Compact lockup for app chrome, where the tagline would be unreadable.
  await record(path.join(PUBLIC_DIR, "logo-compact.png"), await buildCompactLockup(mark));

  // 4. Favicons. Next.js serves these automatically from src/app.
  const ico16 = await squareIcon(mark, 16);
  const ico32 = await squareIcon(mark, 32);
  const ico48 = await squareIcon(mark, 48);
  await record(
    path.join(APP_DIR, "favicon.ico"),
    buildIco([
      { size: 16, data: ico16 },
      { size: 32, data: ico32 },
      { size: 48, data: ico48 },
    ]),
  );
  await record(path.join(APP_DIR, "icon.png"), await squareIcon(mark, 96));

  // 5. Apple touch icon: iOS ignores transparency, so give it the navy tile.
  await record(path.join(APP_DIR, "apple-icon.png"), await squareIcon(mark, 180, NAVY));

  // 6. Open Graph / Twitter card image: wordmark centred on brand navy.
  const ogLogo = await sharp(await trimmed(SOURCE_WIDE))
    .resize({ width: 820, withoutEnlargement: true })
    .toBuffer();

  const og = await sharp({
    create: { width: 1200, height: 630, channels: 4, background: NAVY },
  })
    .composite([{ input: ogLogo, gravity: "center" }])
    .png(PNG_OUTPUT)
    .toBuffer();

  await record(path.join(PUBLIC_DIR, "og-image.png"), og);

  console.log("Generated:");
  for (const line of written) console.log(`  ${line}`);
}

main().catch((error) => {
  console.error("Icon generation failed:", error);
  process.exit(1);
});
