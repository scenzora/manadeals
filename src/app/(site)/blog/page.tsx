import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { listPosts } from "@/services/storefront.service";
import { buildMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils/format";
import { Breadcrumbs, Section, SiteEmptyState, SitePagination } from "@/components/site/ui";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Buying guides and deal analysis",
    description:
      "Honest buying guides, sale calendars and price analysis from the ManaDeals team.",
    path: "/blog",
  });
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const result = await listPosts(Number(page) || 1);

  return (
    <Section>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Blog" }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Buying guides</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Spend smarter — what to buy, when to buy it, and whether a discount is real.
        </p>
      </div>

      {result.items.length === 0 ? (
        <SiteEmptyState title="No articles published yet" />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((post) => (
              <Link
                key={String(post._id)}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] transition-shadow hover:shadow-md"
              >
                {post.featuredImage ? (
                  <div className="relative aspect-[16/9] bg-[var(--muted)]">
                    <Image
                      src={post.featuredImage}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  </div>
                ) : null}

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h2 className="line-clamp-2 font-semibold leading-snug group-hover:text-[var(--primary)]">
                    {post.title}
                  </h2>
                  <p className="line-clamp-3 text-sm text-[var(--muted-foreground)]">{post.excerpt}</p>
                  <p className="mt-auto pt-2 text-xs text-[var(--muted-foreground)]">
                    {formatDate(post.publishedAt)} · {post.readingMinutes} min read
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <SitePagination
            page={result.page}
            totalPages={result.totalPages}
            buildHref={(nextPage) => `/blog?page=${nextPage}`}
          />
        </>
      )}
    </Section>
  );
}
