import { isReservedSlug, isValidSlugFormat } from "@/lib/tenant/host";

/**
 * Names, slugs and domains that imitate a retailer would let a store pose as
 * the retailer itself, which breaks affiliate programme rules and misleads
 * shoppers. Matching is deliberately aggressive: text is lower-cased, common
 * look-alike characters are folded, and separators are removed before the
 * check, so "Am4zon-Deals" and "flip.kart" are both caught.
 */
export const PROTECTED_BRANDS = [
  "amazon",
  "amzn",
  "flipkart",
  "myntra",
  "meesho",
  "ajio",
  "nykaa",
  "snapdeal",
  "tatacliq",
  "croma",
  "reliancedigital",
  "jiomart",
  "shopsy",
  "paytm",
  "phonepe",
  "cuelinks",
  "earnkaro",
  "manadeals",
];

const LOOKALIKES: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };

function fold(input: string) {
  return input
    .toLowerCase()
    .replace(/[01345 7@$!]/g, (character) => LOOKALIKES[character] ?? "")
    .replace(/[^a-z]/g, "");
}

export type SafetyResult = { ok: true } | { ok: false; reason: string };

export function checkBrandSafety(text: string): SafetyResult {
  const folded = fold(text);
  // Folding digits to letters can hide a match ("l1nk"), so also test with digits only dropped.
  const stripped = text.toLowerCase().replace(/[^a-z]/g, "");

  const brand = PROTECTED_BRANDS.find((entry) => folded.includes(entry) || stripped.includes(entry));
  if (!brand) return { ok: true };

  const official = folded.includes("official") || stripped.includes("official");
  return {
    ok: false,
    reason: official
      ? `"Official" stores for ${brand} are not allowed`
      : `Names containing "${brand}" are reserved for the brand itself`,
  };
}

export function validateStoreName(name: string): SafetyResult {
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 60) return { ok: false, reason: "Store name must be 3–60 characters" };
  return checkBrandSafety(trimmed);
}

export function validateStoreSlug(slug: string): SafetyResult {
  if (!isValidSlugFormat(slug)) {
    return { ok: false, reason: "Use 3–30 lowercase letters, numbers and single hyphens" };
  }
  if (isReservedSlug(slug)) return { ok: false, reason: "That address is reserved" };
  return checkBrandSafety(slug);
}

const HOSTNAME_RE = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

export function validateCustomHostname(hostname: string, rootDomain: string): SafetyResult {
  const host = hostname.trim().toLowerCase();
  if (!HOSTNAME_RE.test(host)) return { ok: false, reason: "Enter a valid domain such as johndeals.in" };
  if (host === rootDomain || host.endsWith(`.${rootDomain}`)) {
    return { ok: false, reason: "Use your own domain, not a manadeals.online address" };
  }
  return checkBrandSafety(host);
}
