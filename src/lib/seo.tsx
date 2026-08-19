import type { Metadata } from "next";

import { loadSettings } from "@/services/settings.service";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type RecordSeo = {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
} | null;

/**
 * Builds page metadata from three layers, most specific first:
 *   1. the record's own SEO fields (product, category, article)
 *   2. the values passed by the page
 *   3. the global defaults in Settings → SEO
 */
export async function buildMetadata({
  title,
  description,
  path = "/",
  image,
  seo,
  type = "website",
  noIndex = false,
}: {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  seo?: RecordSeo;
  type?: "website" | "article";
  noIndex?: boolean;
}): Promise<Metadata> {
  const settings = await loadSettings();
  const globalSeo = settings.seo;

  const resolvedTitle = seo?.title || title || globalSeo.title || "ManaDeals.online";
  const resolvedDescription =
    seo?.description || description || globalSeo.description || "The best deals from Amazon, Flipkart and more.";
  const resolvedImage = seo?.ogImage || image || globalSeo.ogImage || "/logo.png";
  const canonicalBase = globalSeo.canonicalUrl || SITE_URL;
  const url = new URL(path, canonicalBase).toString();

  // Titles are brand-suffixed here rather than by the root layout's template,
  // which would double the brand on pages that already name it.
  const siteName = settings.general.siteName || "ManaDeals.online";
  const fullTitle = resolvedTitle.toLowerCase().includes(siteName.toLowerCase().split(".")[0]!)
    ? resolvedTitle
    : `${resolvedTitle} · ${siteName}`;

  return {
    title: { absolute: fullTitle },
    description: resolvedDescription,
    keywords: seo?.keywords?.length ? seo.keywords : globalSeo.keywords,
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type,
      url,
      title: fullTitle,
      description: resolvedDescription,
      siteName,
      images: resolvedImage ? [{ url: resolvedImage }] : undefined,
    },
    twitter: {
      card: (globalSeo.twitterCard as "summary_large_image") || "summary_large_image",
      site: globalSeo.twitterHandle || undefined,
      title: fullTitle,
      description: resolvedDescription,
      images: resolvedImage ? [resolvedImage] : undefined,
    },
    ...(globalSeo.googleSiteVerification
      ? { verification: { google: globalSeo.googleSiteVerification } }
      : {}),
  };
}

/** JSON-LD for a product page, so Google can show price and rating in results. */
export function productJsonLd(product: {
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  images?: string[];
  salePrice: number;
  currency?: string;
  availability?: string;
  rating?: number;
  reviewCount?: number;
  brandName?: string;
}) {
  const inStock = product.availability !== "out-of-stock";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description?.replace(/<[^>]+>/g, "").slice(0, 300),
    image: [product.thumbnail, ...(product.images ?? [])].filter(Boolean),
    ...(product.brandName ? { brand: { "@type": "Brand", name: product.brandName } } : {}),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/product/${product.slug}`,
      priceCurrency: product.currency || "INR",
      price: product.salePrice,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
    ...(product.rating && product.reviewCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };
}

export function articleJsonLd(article: {
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  publishedAt?: Date | string | null;
  authorName?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt,
    image: article.featuredImage ? [article.featuredImage] : undefined,
    datePublished: article.publishedAt ?? undefined,
    author: { "@type": "Person", name: article.authorName || "ManaDeals" },
    mainEntityOfPage: `${SITE_URL}/blog/${article.slug}`,
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: new URL(item.path, SITE_URL).toString(),
    })),
  };
}

/** Renders a JSON-LD block. The payload is ours, never user input. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
