import { describe, expect, it } from "vitest";

import {
  checkBrandSafety,
  validateCustomHostname,
  validateStoreName,
  validateStoreSlug,
} from "@/lib/tenant/identity";

describe("brand blocklist", () => {
  it.each([
    "Amazon Deals",
    "flipkart-offers",
    "Am4zon Best",
    "fl1pkart.deals",
    "My Myntra Store",
    "meesho_hub",
    "Official Amazon Store",
    "AMAZON",
    "mana deals online",
  ])("blocks %s", (text) => {
    expect(checkBrandSafety(text).ok).toBe(false);
  });

  it.each(["Johns Deals", "Bargain Hunters India", "Smart Saver", "official picks"])("allows %s", (text) => {
    expect(checkBrandSafety(text).ok).toBe(true);
  });

  it("explains official + brand combinations", () => {
    const result = checkBrandSafety("Official Flipkart");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/official/i);
  });
});

describe("store identity validation", () => {
  it("validates names", () => {
    expect(validateStoreName("ab").ok).toBe(false);
    expect(validateStoreName("Sharma Deals").ok).toBe(true);
    expect(validateStoreName("Amazon Sharma").ok).toBe(false);
  });

  it("rejects reserved, malformed and branded slugs", () => {
    expect(validateStoreSlug("admin").ok).toBe(false);
    expect(validateStoreSlug("a").ok).toBe(false);
    expect(validateStoreSlug("-bad-").ok).toBe(false);
    expect(validateStoreSlug("double--hyphen").ok).toBe(false);
    expect(validateStoreSlug("amazon-picks").ok).toBe(false);
    expect(validateStoreSlug("sharma-deals").ok).toBe(true);
  });

  it("validates custom domains", () => {
    expect(validateCustomHostname("johndeals.in", "manadeals.online").ok).toBe(true);
    expect(validateCustomHostname("not a domain", "manadeals.online").ok).toBe(false);
    expect(validateCustomHostname("x.manadeals.online", "manadeals.online").ok).toBe(false);
    expect(validateCustomHostname("flipkart-deals.in", "manadeals.online").ok).toBe(false);
  });
});
