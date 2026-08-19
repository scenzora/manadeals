import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Clock } from "lucide-react";

import { getPostBySlug } from "@/services/storefront.service";
import { articleJsonLd, breadcrumbJsonLd, buildMetadata, JsonLd } from "@/lib/seo";
import { formatDate } from "@/lib/utils/format";
import { Breadcrumbs, Section, SectionHeading } from "@/components/site/ui";

export const revalidate = 600;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPostBySlug(slug);
  if (!data) return buildMetadata({ title: "Article not found", noIndex: true });

  return buildMetadata({
    title: data.post.title,
    description: data.post.excerpt,
    path: `/blog/${data.post.slug}`,
    image: data.post.featuredImage,
    seo: data.post.seo,
    type: "article",
  });
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getPostBySlug(slug);
  if (!data) notFound();

  const { post, related } = data;

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          ...post,
          authorName: post.author?.name,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />

      <article>
        <Section className="max-w-3xl">
          <Breadcrumbs
            items={[{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }, { name: post.title }]}
          />

          <h1 className="text-3xl font-semibold leading-tight tracking-tight">{post.title}</h1>

          <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--muted-foreground)]">
            <span>{post.author?.name ?? "ManaDeals"}</span>
            <span aria-hidden>·</span>
            <span>{formatDate(post.publishedAt)}</span>
            <span aria-hidden>·</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {post.readingMinutes} min read
            </span>
          </p>

          {post.excerpt ? (
            <p className="mt-4 text-lg text-[var(--muted-foreground)]">{post.excerpt}</p>
          ) : null}

          {post.featuredImage ? (
            <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-xl bg-[var(--muted)]">
              <Image
                src={post.featuredImage}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                priority
                unoptimized
              />
            </div>
          ) : null}

          {/* Article HTML is authored by our content team in the admin panel. */}
          <div
            className="markdown-body mt-8"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {post.tags?.length ? (
            <div className="mt-8 flex flex-wrap gap-2 border-t border-[var(--border)] pt-6">
              {post.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs text-[var(--muted-foreground)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </Section>
      </article>

      {related.length > 0 ? (
        <Section className="pt-0">
          <SectionHeading title="Read next" href="/blog" />
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((item) => (
              <Link
                key={String(item._id)}
                href={`/blog/${item.slug}`}
                className="group rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-shadow hover:shadow-md"
              >
                <h3 className="line-clamp-2 font-medium leading-snug group-hover:text-[var(--primary)]">
                  {item.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">
                  {item.excerpt}
                </p>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {formatDate(item.publishedAt)}
                </p>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}
