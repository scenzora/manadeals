import { NextResponse, type NextRequest } from "next/server";

import { getStoreSitemapEntries } from "@/services/storefront.service";
import { isIndexable } from "@/lib/tenant/seo";
import { resolveTenantByHost } from "@/lib/tenant/server";
import { scopeCategoryIds } from "@/lib/tenant/page";

export const dynamic = "force-dynamic";

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/** Per-store sitemap on the store's own primary host. */
export async function GET(_request: NextRequest, context: { params: Promise<{ host: string }> }) {
  const { host } = await context.params;
  const tenant = await resolveTenantByHost(decodeURIComponent(host));
  if (!tenant) return new NextResponse("Not found", { status: 404 });

  const origin = `https://${tenant.primaryHostname}`;
  const entries: { path: string; lastmod?: string }[] = [];

  // A store that must stay out of search gets an empty sitemap rather than a misleading one.
  if (isIndexable(tenant, "home")) {
    const data = await getStoreSitemapEntries(
      tenant.id,
      await scopeCategoryIds(tenant.catalog.categories),
      isIndexable(tenant, "product"),
    );
    entries.push({ path: "/" }, { path: "/products" }, { path: "/deals" }, { path: "/coupons" }, { path: "/blog" });
    for (const category of data.categories) entries.push({ path: `/category/${category.slug}`, lastmod: category.updatedAt });
    for (const product of data.products) entries.push({ path: `/product/${product.slug}`, lastmod: product.updatedAt });
    for (const post of data.posts) entries.push({ path: `/blog/${post.slug}`, lastmod: post.updatedAt });
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries
      .map(
        (entry) =>
          `  <url><loc>${escapeXml(origin + entry.path)}</loc>${entry.lastmod ? `<lastmod>${new Date(entry.lastmod).toISOString()}</lastmod>` : ""}</url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;

  return new NextResponse(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
