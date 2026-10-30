import { describe, expect, it } from "vitest";

import { isIndexable, storeMetadata, type SeoTenant } from "@/lib/tenant/seo";

const store = (overrides: Partial<SeoTenant> = {}): SeoTenant => ({
  status: "active",
  plan: "free",
  hasCustomDomain: false,
  publishedPosts: 0,
  ...overrides,
});

describe("isIndexable", () => {
  it("never indexes draft or suspended stores, whatever the policy", () => {
    for (const policy of ["noindex-products", "min-content", "index-all"] as const) {
      expect(isIndexable(store({ status: "draft" }), "home", policy)).toBe(false);
      expect(isIndexable(store({ status: "suspended", plan: "pro" }), "home", policy)).toBe(false);
    }
  });

  it("noindex-products keeps copied product pages out for free subdomain stores only", () => {
    expect(isIndexable(store(), "home", "noindex-products")).toBe(true);
    expect(isIndexable(store(), "product", "noindex-products")).toBe(false);
    expect(isIndexable(store({ plan: "pro" }), "product", "noindex-products")).toBe(false); // no domain yet
    expect(isIndexable(store({ plan: "pro", hasCustomDomain: true }), "product", "noindex-products")).toBe(true);
  });

  it("min-content requires the configured number of original posts", () => {
    expect(isIndexable(store({ publishedPosts: 2 }), "home", "min-content", 3)).toBe(false);
    expect(isIndexable(store({ publishedPosts: 3 }), "home", "min-content", 3)).toBe(true);
    expect(isIndexable(store({ publishedPosts: 3 }), "product", "min-content", 3)).toBe(true);
  });

  it("index-all allows every active store page", () => {
    expect(isIndexable(store(), "product", "index-all")).toBe(true);
  });
});

describe("storeMetadata", () => {
  const tenant = { ...store(), name: "John Deals" };

  it("uses a relative canonical so it resolves on the store's primary host", () => {
    const meta = storeMetadata(tenant, { path: "/blog/hello", title: "Hello" });
    expect(meta.alternates?.canonical).toBe("/blog/hello");
    expect(meta.openGraph).toMatchObject({ siteName: "John Deals", url: "/blog/hello" });
  });

  it("noindexes filtered listings and policy-blocked product pages", () => {
    expect(storeMetadata(tenant, { path: "/products", extraNoIndex: true }).robots).toMatchObject({ index: false });
    expect(storeMetadata(tenant, { path: "/product/x", kind: "product" }).robots).toMatchObject({ index: false });
    expect(storeMetadata(tenant, { path: "/blog" }).robots).toMatchObject({ index: true });
  });
});
