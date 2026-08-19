import type { MetadataRoute } from "next";

import connectToDatabase from "@/lib/mongodb";
import { getSitemapEntries } from "@/services/storefront.service";
import { loadSettings } from "@/services/settings.service";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectToDatabase();
  const settings = await loadSettings();

  const base = settings.seo.canonicalUrl || SITE_URL;
  const url = (path: string) => new URL(path, base).toString();

  // Admins can switch the sitemap off entirely in Settings → SEO.
  if (settings.seo.sitemapEnabled === false) {
    return [{ url: url("/"), lastModified: new Date(), priority: 1 }];
  }

  const { products, categories, brands, posts } = await getSitemapEntries();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/products"), changeFrequency: "daily", priority: 0.9 },
    { url: url("/deals"), changeFrequency: "hourly", priority: 0.9 },
    { url: url("/coupons"), changeFrequency: "daily", priority: 0.8 },
    { url: url("/blog"), changeFrequency: "weekly", priority: 0.7 },
  ];

  return [
    ...staticRoutes,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...categories.map((entry: any) => ({
      url: url(`/category/${entry.slug}`),
      lastModified: new Date(entry.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...products.map((entry: any) => ({
      url: url(`/product/${entry.slug}`),
      lastModified: new Date(entry.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...brands.map((entry: any) => ({
      url: url(`/brand/${entry.slug}`),
      lastModified: new Date(entry.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...posts.map((entry: any) => ({
      url: url(`/blog/${entry.slug}`),
      lastModified: new Date(entry.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
