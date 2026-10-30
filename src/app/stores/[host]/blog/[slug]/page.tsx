import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getStorePost } from "@/services/storefront.service";
import { storeMetadata } from "@/lib/tenant/seo";
import { requireTenant, type HostParams } from "@/lib/tenant/page";
import { renderMarkdown } from "@/lib/utils/markdown";
import { formatDate } from "@/lib/utils/format";
import { Breadcrumbs, Section } from "@/components/site/ui";

export const revalidate = 300;

type Params = HostParams & Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [tenant, { slug }] = await Promise.all([requireTenant(params), params]);
  const post = await getStorePost(tenant.id, slug);
  if (!post) return { robots: { index: false } };
  return storeMetadata(tenant, {
    path: `/blog/${post.slug}`,
    title: post.title,
    description: post.excerpt || undefined,
    image: post.featuredImage || undefined,
  });
}

export default async function StoreBlogPostPage({ params }: { params: Params }) {
  const [tenant, { slug }] = await Promise.all([requireTenant(params), params]);
  const post = await getStorePost(tenant.id, slug);
  if (!post) notFound();

  return (
    <Section className="max-w-3xl">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }, { name: post.title }]} />
      <article className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {formatDate(post.publishedAt)} · {post.readingMinutes} min read
        </p>
        {post.featuredImage ? (
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-[var(--muted)]">
            <Image src={post.featuredImage} alt={post.title} fill sizes="768px" className="object-cover" unoptimized />
          </div>
        ) : null}
        {/* renderMarkdown escapes all input before formatting, so owner content cannot inject HTML. */}
        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
      </article>
    </Section>
  );
}
