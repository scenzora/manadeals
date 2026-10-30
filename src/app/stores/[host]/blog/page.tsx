import Image from "next/image";
import Link from "next/link";

import { listStorePosts } from "@/services/storefront.service";
import { requireTenant, type HostParams } from "@/lib/tenant/page";
import { formatDate } from "@/lib/utils/format";
import { Breadcrumbs, Section, SiteEmptyState, SitePagination } from "@/components/site/ui";

export const revalidate = 300;

export default async function StoreBlogIndex({
  params,
  searchParams,
}: {
  params: HostParams;
  searchParams: Promise<{ page?: string }>;
}) {
  const tenant = await requireTenant(params);
  const { page } = await searchParams;
  const result = await listStorePosts(tenant.id, Number(page) || 1);

  return (
    <Section>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Blog" }]} />
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Blog</h1>

      {result.items.length === 0 ? (
        <SiteEmptyState title="No articles published yet" />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((post) => (
              <Link
                key={String(post._id)}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] hover:shadow-md"
              >
                {post.featuredImage ? (
                  <div className="relative aspect-[16/9] bg-[var(--muted)]">
                    <Image src={post.featuredImage} alt={post.title} fill sizes="33vw" className="object-cover" unoptimized />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h2 className="line-clamp-2 font-semibold leading-snug group-hover:text-[var(--primary)]">{post.title}</h2>
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
            buildHref={(next) => `/blog?page=${next}`}
          />
        </>
      )}
    </Section>
  );
}
