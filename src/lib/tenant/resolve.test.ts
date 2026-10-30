import { describe, expect, it, vi } from "vitest";

import { createTenantResolver, type PublicTenant, type TenantLookup } from "@/lib/tenant/resolve";
import { DEFAULT_THEME } from "@/lib/tenant/theme";

const tenant = (slug: string): PublicTenant => ({
  id: slug,
  slug,
  name: slug,
  plan: "free",
  status: "active",
  theme: DEFAULT_THEME,
  branding: { logoUrl: "", faviconUrl: "", tagline: "", footerText: "", contactEmail: "", social: {} },
  catalog: { categories: [], dealOfTheDay: null, sections: [] },
  primaryHostname: `${slug}.manadeals.online`,
});

describe("tenant resolver", () => {
  it("returns null for the main site without touching the lookup", async () => {
    const lookup = vi.fn<TenantLookup>();
    const resolver = createTenantResolver(lookup, "manadeals.online");
    expect(await resolver.resolve("www.manadeals.online")).toBeNull();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("resolves subdomains and custom domains through the lookup", async () => {
    const lookup = vi.fn<TenantLookup>(async (target) =>
      target.kind === "subdomain" ? tenant(target.slug) : tenant("john"),
    );
    const resolver = createTenantResolver(lookup, "manadeals.online");
    expect((await resolver.resolve("acme.manadeals.online"))?.slug).toBe("acme");
    expect((await resolver.resolve("www.johndeals.in"))?.slug).toBe("john");
    expect(lookup.mock.calls[1][0]).toEqual({ kind: "custom", hostname: "johndeals.in" });
  });

  it("caches hits and misses, and invalidates on demand", async () => {
    const lookup = vi.fn<TenantLookup>(async (target) =>
      target.kind === "subdomain" && target.slug === "acme" ? tenant("acme") : null,
    );
    const resolver = createTenantResolver(lookup, "manadeals.online");

    await resolver.resolve("acme.manadeals.online");
    await resolver.resolve("acme.manadeals.online");
    await resolver.resolve("ghost.manadeals.online");
    await resolver.resolve("ghost.manadeals.online");
    expect(lookup).toHaveBeenCalledTimes(2);

    resolver.invalidate("acme.manadeals.online");
    await resolver.resolve("acme.manadeals.online");
    expect(lookup).toHaveBeenCalledTimes(3);
  });
});
