import { LruCache } from "@/lib/lru";
import { parseHost, normaliseHost, type HostTarget } from "@/lib/tenant/host";
import type { TenantTheme } from "@/lib/tenant/theme";

export type PublicTenant = {
  id: string;
  slug: string;
  name: string;
  plan: "free" | "pro";
  status: "draft" | "active" | "suspended";
  theme: TenantTheme;
  branding: {
    logoUrl: string;
    faviconUrl: string;
    tagline: string;
    footerText: string;
    contactEmail: string;
    social: Record<string, string>;
  };
  /** Number of published blog posts; feeds the indexing policy. */
  publishedPosts: number;
  /** True when the primary host is a verified custom domain. */
  hasCustomDomain: boolean;
  showPoweredBy: boolean;
  catalog: { categories: string[]; dealOfTheDay: string | null; sections: { key: string; enabled: boolean }[] };
  /** The hostname this tenant answers on as primary (custom domain, else subdomain). */
  primaryHostname: string;
};

/** What a lookup needs to find: a slug (free subdomain) or a verified custom hostname. */
export type TenantLookup = (target: Exclude<HostTarget, { kind: "main" }>) => Promise<PublicTenant | null>;

const HIT_TTL_MS = 60_000;
const MISS_TTL_MS = 15_000;

/**
 * Builds a resolver around a lookup function, caching hits for a minute and
 * misses briefly so unknown hosts cannot hammer the database.
 */
export function createTenantResolver(lookup: TenantLookup, rootDomain?: string) {
  const cache = new LruCache<PublicTenant | null>(500, HIT_TTL_MS);

  return {
    async resolve(rawHost: string | null | undefined): Promise<PublicTenant | null> {
      const target = parseHost(rawHost, rootDomain);
      if (target.kind === "main") return null;

      const key = target.hostname;
      const cached = cache.get(key);
      if (cached !== undefined) return cached;

      const tenant = await lookup(target);
      cache.set(key, tenant, tenant ? HIT_TTL_MS : MISS_TTL_MS);
      return tenant;
    },
    /** Call after a tenant, theme or domain changes so the next request sees it. */
    invalidate(rawHost: string) {
      cache.delete(normaliseHost(rawHost));
    },
    clear() {
      cache.clear();
    },
  };
}
