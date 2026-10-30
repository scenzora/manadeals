import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";

import { getStoreHomeData } from "@/services/storefront.service";
import { normaliseSections } from "@/lib/tenant/sections";
import { requireTenant, scopeCategoryIds, type HostParams } from "@/lib/tenant/page";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { ProductCard, ProductGrid } from "@/components/site/product-card";
import { DealCard, type PublicDeal } from "@/components/site/deal-card";
import { CouponCard, type PublicCoupon } from "@/components/site/coupon-card";
import { Section, SectionHeading } from "@/components/site/ui";

export const revalidate = 300;

export default async function StoreHomePage({ params }: { params: HostParams }) {
  const tenant = await requireTenant(params);
  const sections = normaliseSections(tenant.catalog.sections).filter((section) => section.enabled);

  const data = await getStoreHomeData({
    tenantId: tenant.id,
    categoryIds: await scopeCategoryIds(tenant.catalog.categories),
    dealOfTheDayId: tenant.catalog.dealOfTheDay,
    enabled: sections.map((section) => section.key),
  });

  const blocks: Record<string, React.ReactNode> = {
    dealOfTheDay: data.dealOfTheDay ? (
      <Section key="dealOfTheDay">
        <SectionHeading title="Deal of the day" subtitle="Our single best pick today" />
        <div className="grid items-center gap-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 md:grid-cols-[280px_1fr]">
          <Link
            href={`/product/${data.dealOfTheDay.slug}`}
            className="relative aspect-square overflow-hidden rounded-lg bg-white"
          >
            {data.dealOfTheDay.thumbnail ? (
              <Image
                src={data.dealOfTheDay.thumbnail}
                alt={data.dealOfTheDay.name}
                fill
                sizes="280px"
                className="object-contain p-4"
                unoptimized
              />
            ) : null}
          </Link>
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-[var(--primary-foreground)]">
              <Flame className="size-3.5" />
              {data.dealOfTheDay.discountPercentage}% off today
            </span>
            <h3 className="text-xl font-semibold leading-snug">
              <Link href={`/product/${data.dealOfTheDay.slug}`} className="hover:text-[var(--primary)]">
                {data.dealOfTheDay.name}
              </Link>
            </h3>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-semibold">{formatCurrency(data.dealOfTheDay.salePrice)}</span>
              <span className="text-[var(--muted-foreground)] line-through">
                {formatCurrency(data.dealOfTheDay.originalPrice)}
              </span>
            </div>
            <Link
              href={`/product/${data.dealOfTheDay.slug}`}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)]"
            >
              See the deal
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </Section>
    ) : null,

    featured: data.featured.length ? (
      <Section key="featured">
        <SectionHeading title="Featured products" href="/products?sort=popular" />
        <ProductGrid products={data.featured} />
      </Section>
    ) : null,

    trending: data.trending.length ? (
      <Section key="trending">
        <SectionHeading title="Trending now" href="/products?sort=popular" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {data.trending.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </Section>
    ) : null,

    biggestDiscounts: data.biggestDiscounts.length ? (
      <Section key="biggestDiscounts">
        <SectionHeading title="Biggest discounts" subtitle="30% off or more" href="/products?sort=discount" />
        <ProductGrid products={data.biggestDiscounts} />
      </Section>
    ) : null,

    deals: data.deals.length ? (
      <Section key="deals">
        <SectionHeading title="Live deals" subtitle="Ending soon" href="/deals" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data.deals as PublicDeal[]).slice(0, 3).map((deal) => (
            <DealCard key={deal._id} deal={deal} />
          ))}
        </div>
      </Section>
    ) : null,

    coupons: data.coupons.length ? (
      <Section key="coupons">
        <SectionHeading title="Coupons you can use today" href="/coupons" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data.coupons as PublicCoupon[]).slice(0, 3).map((coupon) => (
            <CouponCard key={coupon._id} coupon={coupon} />
          ))}
        </div>
      </Section>
    ) : null,

    posts: data.posts.length ? (
      <Section key="posts">
        <SectionHeading title="From the blog" href="/blog" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.posts.map((post) => (
            <Link
              key={String(post._id)}
              href={`/blog/${post.slug}`}
              className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:shadow-md"
            >
              <h3 className="line-clamp-2 font-medium leading-snug">{post.title}</h3>
              <p className="line-clamp-2 text-sm text-[var(--muted-foreground)]">{post.excerpt}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {formatDate(post.publishedAt)} · {post.readingMinutes} min read
              </p>
            </Link>
          ))}
        </div>
      </Section>
    ) : null,
  };

  return (
    <>
      <section className="border-b border-[var(--border)] bg-[var(--secondary)]">
        <div className="mx-auto max-w-7xl space-y-5 px-4 py-12 sm:px-6 lg:py-16">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-[var(--secondary-foreground)] sm:text-4xl lg:text-5xl">
            {tenant.name}
          </h1>
          <p className="max-w-xl text-[var(--secondary-foreground)] opacity-70">
            {tenant.branding.tagline || "Hand-picked deals with real price history."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)]"
            >
              Browse products
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/deals"
              className="inline-flex items-center gap-2 rounded-lg border border-current px-5 py-2.5 text-sm font-medium text-[var(--secondary-foreground)]"
            >
              Today&apos;s deals
            </Link>
          </div>
        </div>
      </section>

      {sections.map((section) => blocks[section.key] ?? null)}
    </>
  );
}
