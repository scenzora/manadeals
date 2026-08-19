import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Flame, ShieldCheck, Tag, TrendingUp } from "lucide-react";

import { getHomeData } from "@/services/storefront.service";
import { buildMetadata } from "@/lib/seo";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { ProductCard, ProductGrid } from "@/components/site/product-card";
import { DealCard, type PublicDeal } from "@/components/site/deal-card";
import { CouponCard, type PublicCoupon } from "@/components/site/coupon-card";
import { Section, SectionHeading, SiteEmptyState } from "@/components/site/ui";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "ManaDeals.online — Best deals from Amazon, Flipkart & more",
    description:
      "Handpicked deals, verified coupons and real price history across Amazon, Flipkart and other stores. Know when a discount is actually a discount.",
    path: "/",
  });
}

export default async function HomePage() {
  const data = await getHomeData();
  const hero = data.banners[0];

  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--border)] bg-[var(--secondary)]">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-16">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
              <Flame className="size-3.5 text-[var(--primary)]" />
              {data.deals.length > 0 ? `${data.deals.length} live deals right now` : "Fresh deals daily"}
            </span>

            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              {hero?.title ?? "Real discounts."}
              <br />
              <span className="text-[var(--primary)]">
                {hero?.subtitle ?? "Not inflated MRPs."}
              </span>
            </h1>

            <p className="max-w-lg text-white/70">
              We track prices across Amazon, Flipkart and more, so you can see whether today&apos;s
              &ldquo;70% off&rdquo; is genuinely the lowest it has been.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/deals"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#e85f00]"
              >
                Today&apos;s deals
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
              >
                Browse products
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-xs text-white/60">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-4" />
                Verified coupons
              </span>
              <span className="flex items-center gap-1.5">
                <TrendingUp className="size-4" />
                Price history on every product
              </span>
            </div>
          </div>

          {hero?.desktopImage ? (
            <Link
              href={hero.ctaUrl || "/deals"}
              className="relative hidden aspect-[16/10] overflow-hidden rounded-xl border border-white/10 lg:block"
            >
              <Image
                src={hero.desktopImage}
                alt={hero.title}
                fill
                sizes="50vw"
                className="object-cover"
                priority
                unoptimized
              />
            </Link>
          ) : null}
        </div>
      </section>

      {/* Categories */}
      {data.categories.length > 0 ? (
        <Section>
          <SectionHeading title="Shop by category" href="/products" linkLabel="All products" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {data.categories.map((category) => (
              <Link
                key={String(category._id)}
                href={`/category/${category.slug}`}
                className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center transition-colors hover:border-[var(--primary)] hover:bg-[var(--accent)]"
              >
                <span className="flex size-11 items-center justify-center overflow-hidden rounded-full bg-[var(--muted)]">
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt=""
                      width={44}
                      height={44}
                      className="size-11 object-cover"
                      unoptimized
                    />
                  ) : (
                    <Tag className="size-5 text-[var(--muted-foreground)]" />
                  )}
                </span>
                <span className="text-xs font-medium leading-tight">{category.name}</span>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Deal of the day */}
      {data.dealOfTheDay ? (
        <Section>
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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white">
                <Flame className="size-3.5" />
                {data.dealOfTheDay.discountPercentage}% off today
              </span>

              <h3 className="text-xl font-semibold leading-snug">
                <Link href={`/product/${data.dealOfTheDay.slug}`} className="hover:text-[var(--primary)]">
                  {data.dealOfTheDay.name}
                </Link>
              </h3>

              {data.dealOfTheDay.shortDescription ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  {data.dealOfTheDay.shortDescription}
                </p>
              ) : null}

              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-semibold">
                  {formatCurrency(data.dealOfTheDay.salePrice)}
                </span>
                <span className="text-[var(--muted-foreground)] line-through">
                  {formatCurrency(data.dealOfTheDay.originalPrice)}
                </span>
                <span className="text-sm font-medium text-[var(--success)]">
                  Save {formatCurrency(data.dealOfTheDay.originalPrice - data.dealOfTheDay.salePrice)}
                </span>
              </div>

              <Link
                href={`/product/${data.dealOfTheDay.slug}`}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#e85f00]"
              >
                See the deal
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </Section>
      ) : null}

      {/* Live deals */}
      {data.deals.length > 0 ? (
        <Section>
          <SectionHeading title="Live deals" subtitle="Ending soon" href="/deals" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data.deals as PublicDeal[]).slice(0, 3).map((deal) => (
              <DealCard key={deal._id} deal={deal} />
            ))}
          </div>
        </Section>
      ) : null}

      {/* Featured products */}
      <Section>
        <SectionHeading title="Featured products" href="/products?sort=popular" />
        {data.featured.length > 0 ? (
          <ProductGrid products={data.featured} />
        ) : (
          <SiteEmptyState title="No featured products yet" description="Check back shortly." />
        )}
      </Section>

      {/* Biggest discounts */}
      {data.biggestDiscounts.length > 0 ? (
        <Section>
          <SectionHeading
            title="Biggest discounts"
            subtitle="30% off or more"
            href="/products?sort=discount"
          />
          <ProductGrid products={data.biggestDiscounts} />
        </Section>
      ) : null}

      {/* Coupons */}
      {data.coupons.length > 0 ? (
        <Section>
          <SectionHeading title="Coupons you can use today" href="/coupons" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data.coupons as PublicCoupon[]).slice(0, 3).map((coupon) => (
              <CouponCard key={coupon._id} coupon={coupon} />
            ))}
          </div>
        </Section>
      ) : null}

      {/* Trending */}
      {data.trending.length > 0 ? (
        <Section>
          <SectionHeading title="Trending now" href="/products?sort=popular" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {data.trending.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </Section>
      ) : null}

      {/* Blog */}
      {data.posts.length > 0 ? (
        <Section>
          <SectionHeading title="Buying guides" subtitle="Spend smarter, not just less" href="/blog" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.posts.map((post) => (
              <Link
                key={String(post._id)}
                href={`/blog/${post.slug}`}
                className="group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] transition-shadow hover:shadow-md"
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
                <div className="space-y-2 p-4">
                  <h3 className="line-clamp-2 font-medium leading-snug group-hover:text-[var(--primary)]">
                    {post.title}
                  </h3>
                  <p className="line-clamp-2 text-sm text-[var(--muted-foreground)]">{post.excerpt}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {formatDate(post.publishedAt)} · {post.readingMinutes} min read
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}
