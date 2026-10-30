import type { Metadata } from "next";

/**
 * Search-indexing policy for white-label stores.
 *
 * Stores reuse ManaDeals' product catalogue, so an unchanged copy of a product
 * page on a free subdomain is duplicate content. The policy is configurable:
 *
 *   noindex-products (default) – free subdomain stores keep product pages out of
 *       search; Pro stores on their own domain are fully indexable.
 *   min-content – a store is indexable only once it has published at least
 *       STORE_MIN_ORIGINAL_POSTS blog posts of its own (any plan).
 *   index-all – no restriction (use with care).
 */
export type IndexPolicy = "noindex-products" | "min-content" | "index-all";
export type PageKind = "home" | "product" | "other";

export const INDEX_POLICY: IndexPolicy = (["noindex-products", "min-content", "index-all"] as const).includes(
  process.env.STORE_INDEX_POLICY as IndexPolicy,
)
  ? (process.env.STORE_INDEX_POLICY as IndexPolicy)
  : "noindex-products";

export const MIN_ORIGINAL_POSTS = Math.max(0, Number(process.env.STORE_MIN_ORIGINAL_POSTS ?? 3) || 0);

export type SeoTenant = {
  status: "draft" | "active" | "suspended";
  plan: "free" | "pro";
  /** True when the store's primary host is a verified custom domain. */
  hasCustomDomain: boolean;
  publishedPosts: number;
};

export function isIndexable(
  tenant: SeoTenant,
  kind: PageKind,
  policy: IndexPolicy = INDEX_POLICY,
  minPosts: number = MIN_ORIGINAL_POSTS,
) {
  if (tenant.status !== "active") return false;

  switch (policy) {
    case "index-all":
      return true;
    case "min-content":
      return tenant.publishedPosts >= minPosts;
    case "noindex-products":
      return kind === "product" ? tenant.plan === "pro" && tenant.hasCustomDomain : true;
  }
}

/** Metadata for one store page: canonical on the store's primary host, robots from the policy. */
export function storeMetadata(
  tenant: SeoTenant & { name: string },
  options: { path: string; kind?: PageKind; title?: string; description?: string; image?: string; extraNoIndex?: boolean },
): Metadata {
  const indexable = isIndexable(tenant, options.kind ?? "other") && !options.extraNoIndex;
  return {
    title: options.title,
    description: options.description,
    // Relative to the layout's metadataBase, which is the primary host.
    alternates: { canonical: options.path },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: options.title ?? tenant.name,
      description: options.description,
      url: options.path,
      siteName: tenant.name,
      images: options.image ? [options.image] : undefined,
    },
  };
}
