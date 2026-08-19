import type { MetadataRoute } from "next";

import connectToDatabase from "@/lib/mongodb";
import { loadSettings } from "@/services/settings.service";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connectToDatabase();
  const settings = await loadSettings();

  const base = settings.seo.canonicalUrl || SITE_URL;
  const blocked = settings.system.maintenanceMode || settings.seo.robots?.includes("noindex");

  return {
    rules: blocked
      ? [{ userAgent: "*", disallow: "/" }]
      : [
          {
            userAgent: "*",
            allow: "/",
            // /go carries affiliate links and /admin is private; neither should
            // ever appear in a search index.
            disallow: ["/admin", "/api/", "/go/"],
          },
        ],
    sitemap: settings.seo.sitemapEnabled === false ? undefined : new URL("/sitemap.xml", base).toString(),
  };
}
