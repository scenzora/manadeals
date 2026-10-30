import { NextResponse, type NextRequest } from "next/server";

import { isIndexable } from "@/lib/tenant/seo";
import { resolveTenantByHost } from "@/lib/tenant/server";

export const dynamic = "force-dynamic";

/** Per-store robots.txt, pointing crawlers at the store's own sitemap. */
export async function GET(_request: NextRequest, context: { params: Promise<{ host: string }> }) {
  const { host } = await context.params;
  const tenant = await resolveTenantByHost(decodeURIComponent(host));
  if (!tenant) return new NextResponse("Not found", { status: 404 });

  const lines = ["User-agent: *"];
  if (tenant.status !== "active" || !isIndexable(tenant, "home")) {
    lines.push("Disallow: /");
  } else {
    // /go carries affiliate redirects and should never be crawled.
    lines.push("Allow: /", "Disallow: /go/", "Disallow: /api/", `Sitemap: https://${tenant.primaryHostname}/sitemap.xml`);
  }

  return new NextResponse(lines.join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
