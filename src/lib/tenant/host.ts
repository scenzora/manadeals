/**
 * Pure host parsing. No database and no Node-only imports, so it is safe to use
 * from `proxy.ts`.
 */

export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "manadeals.online").toLowerCase();

/** Subdomains that belong to the platform itself and can never be a store slug. */
export const RESERVED_SLUGS = new Set([
  "www",
  "stores",
  "admin",
  "api",
  "app",
  "dashboard",
  "media",
  "static",
  "assets",
  "mail",
  "support",
  "help",
  "blog",
  "status",
  "go",
]);

export type HostTarget =
  | { kind: "main" }
  | { kind: "subdomain"; slug: string; hostname: string }
  | { kind: "custom"; hostname: string };

/** Lower-cases, drops the port and a leading `www.`. */
export function normaliseHost(raw: string | null | undefined) {
  if (!raw) return "";
  let host = raw.trim().toLowerCase();
  host = host.replace(/:\d+$/, "").replace(/\.$/, "");
  if (host.startsWith("www.")) host = host.slice(4);
  return host;
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

export function isValidSlugFormat(slug: string) {
  return SLUG_RE.test(slug) && !slug.includes("--");
}

export function isReservedSlug(slug: string) {
  return RESERVED_SLUGS.has(slug);
}

/** Classifies a Host header as the main site, a free `{slug}` subdomain, or a custom domain. */
export function parseHost(rawHost: string | null | undefined, rootDomain = ROOT_DOMAIN): HostTarget {
  const hostname = normaliseHost(rawHost);
  if (!hostname) return { kind: "main" };

  // Local development: `acme.localhost:3000` is a store, bare `localhost` is the main site.
  const roots = rootDomain === "localhost" ? ["localhost"] : [rootDomain, "localhost"];
  if (hostname === "127.0.0.1" || hostname === "[::1]" || hostname.endsWith(".vercel.app")) {
    return { kind: "main" };
  }

  for (const root of roots) {
    if (hostname === root) return { kind: "main" };
    if (hostname.endsWith(`.${root}`)) {
      const label = hostname.slice(0, -(root.length + 1));
      // Only single-label subdomains are stores; `a.b.manadeals.online` is not.
      if (label.includes(".") || isReservedSlug(label) || !isValidSlugFormat(label)) {
        return { kind: "main" };
      }
      return { kind: "subdomain", slug: label, hostname };
    }
  }

  return { kind: "custom", hostname };
}
