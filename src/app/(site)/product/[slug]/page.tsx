import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Check, ExternalLink, Package, ShieldCheck, Star, Truck } from "lucide-react";

import { getProductBySlug } from "@/services/storefront.service";
import { loadSettings } from "@/services/settings.service";
import { buildMetadata, breadcrumbJsonLd, JsonLd, productJsonLd } from "@/lib/seo";
import { formatCurrency, formatCompact, formatDate } from "@/lib/utils/format";
import { ProductGallery } from "@/components/site/product-gallery";
import { PriceHistoryPanel } from "@/components/site/price-history-panel";
import { ProductCard } from "@/components/site/product-card";
import { ViewTracker } from "@/components/site/view-tracker";
import { Breadcrumbs, Section, SectionHeading } from "@/components/site/ui";

export const revalidate = 300;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) return buildMetadata({ title: "Product not found", noIndex: true });

  const { product } = data;
  return buildMetadata({
    title: `${product.name} — ${formatCurrency(product.salePrice)}`,
    description:
      product.shortDescription ||
      `Buy ${product.name} at ${formatCurrency(product.salePrice)}. Compare prices and see the full price history on ManaDeals.`,
    path: `/product/${product.slug}`,
    image: product.thumbnail,
    seo: product.seo,
  });
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) notFound();

  const { product, history, reviews, related } = data;
  const settings = await loadSettings();
  const openInNewTab = settings.affiliate.openInNewTab !== false;

  const saving = product.originalPrice - product.salePrice;
  const outOfStock = product.availability === "out-of-stock";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const links = (product.affiliateLinks ?? []) as any[];
  const primary = links.find((link) => link.isPrimary) ?? links[0];
  const others = links.filter((link) => link !== primary);

  return (
    <>
      <ViewTracker productId={String(product._id)} />

      <JsonLd
        data={productJsonLd({
          ...product,
          brandName: product.brand?.name,
          description: product.shortDescription || product.description,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          ...(product.category
            ? [{ name: product.category.name, path: `/category/${product.category.slug}` }]
            : []),
          { name: product.name, path: `/product/${product.slug}` },
        ])}
      />

      <Section>
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            ...(product.category
              ? [{ name: product.category.name, href: `/category/${product.category.slug}` }]
              : []),
            { name: product.name },
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
          <ProductGallery
            images={[product.thumbnail, ...(product.images ?? [])]}
            alt={product.name}
            discountPercentage={product.discountPercentage}
          />

          <div className="space-y-5">
            <div className="space-y-2">
              {product.brand?.name ? (
                <Link
                  href={`/brand/${product.brand.slug}`}
                  className="text-sm font-medium text-[var(--primary)] hover:underline"
                >
                  {product.brand.name}
                </Link>
              ) : null}

              <h1 className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
                {product.name}
              </h1>

              {product.rating > 0 ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1 rounded bg-[#ecfdf3] px-2 py-0.5 font-semibold text-[var(--success)]">
                    {product.rating.toFixed(1)}
                    <Star className="size-3.5 fill-current" />
                  </span>
                  <span className="text-[var(--muted-foreground)]">
                    {formatCompact(product.reviewCount)} ratings
                  </span>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-semibold">{formatCurrency(product.salePrice)}</span>
                {saving > 0 ? (
                  <>
                    <span className="text-lg text-[var(--muted-foreground)] line-through">
                      {formatCurrency(product.originalPrice)}
                    </span>
                    <span className="rounded-full bg-[#ecfdf3] px-2.5 py-0.5 text-sm font-semibold text-[var(--success)]">
                      Save {formatCurrency(saving)}
                    </span>
                  </>
                ) : null}
              </div>

              <p className="mt-1 flex items-center gap-1.5 text-sm">
                {outOfStock ? (
                  <span className="text-[var(--destructive)]">Currently out of stock</span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[var(--success)]">
                    <Check className="size-4" />
                    In stock
                  </span>
                )}
              </p>

              {/* Primary click-out. All outbound links route through /go so the
                  click is recorded and the tracking id is applied centrally. */}
              {primary ? (
                <a
                  href={`/go/${product._id}?n=${primary.network?._id ?? ""}`}
                  target={openInNewTab ? "_blank" : undefined}
                  rel="nofollow noopener sponsored"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-[#e85f00]"
                >
                  Buy at {primary.network?.name ?? "store"}
                  <ExternalLink className="size-4" />
                </a>
              ) : null}

              {others.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                    Also available at
                  </p>
                  {others.map((link) => (
                    <a
                      key={String(link.network?._id ?? link.affiliateUrl)}
                      href={`/go/${product._id}?n=${link.network?._id ?? ""}`}
                      target={openInNewTab ? "_blank" : undefined}
                      rel="nofollow noopener sponsored"
                      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm transition-colors hover:border-[var(--primary)] hover:bg-[var(--accent)]"
                    >
                      <span className="font-medium">{link.network?.name ?? "Store"}</span>
                      <span className="flex items-center gap-2">
                        {link.price ? (
                          <span className="font-semibold">{formatCurrency(link.price)}</span>
                        ) : null}
                        <ExternalLink className="size-3.5 text-[var(--muted-foreground)]" />
                      </span>
                    </a>
                  ))}
                </div>
              ) : null}

              <p className="mt-3 text-[11px] text-[var(--muted-foreground)]">
                Price and availability are accurate as of {formatDate(product.updatedAt)} and can
                change on the retailer&apos;s site. We may earn a commission from these links.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              {[
                { icon: ShieldCheck, label: "Verified seller links" },
                { icon: Truck, label: "Shipped by the retailer" },
                { icon: Package, label: "Retailer returns apply" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
                >
                  <item.icon className="size-4 text-[var(--primary)]" />
                  <span className="text-[var(--muted-foreground)]">{item.label}</span>
                </div>
              ))}
            </div>

            {product.shortDescription ? (
              <p className="text-sm text-[var(--muted-foreground)]">{product.shortDescription}</p>
            ) : null}
          </div>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="grid gap-6 lg:grid-cols-2">
          <PriceHistoryPanel history={history} currentPrice={product.salePrice} />

          {product.description ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="mb-3 font-semibold">About this product</h2>
              {/* Description is authored by our admins in the panel. */}
              <div
                className="markdown-body text-sm"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          ) : null}
        </div>
      </Section>

      {reviews.length > 0 ? (
        <Section className="pt-0">
          <SectionHeading title="What shoppers say" />
          <div className="grid gap-4 sm:grid-cols-2">
            {reviews.map((review) => (
              <article
                key={String(review._id)}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={
                          index < review.rating
                            ? "size-3.5 fill-[var(--primary)] text-[var(--primary)]"
                            : "size-3.5 text-[var(--border)]"
                        }
                      />
                    ))}
                  </span>
                  <span className="text-sm font-medium">{review.title || "Review"}</span>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">{review.comment}</p>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {review.authorName || "Verified shopper"} · {formatDate(review.createdAt)}
                </p>
              </article>
            ))}
          </div>
        </Section>
      ) : null}

      {related.length > 0 ? (
        <Section className="pt-0">
          <SectionHeading
            title="Similar products"
            href={product.category ? `/category/${product.category.slug}` : "/products"}
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {related.slice(0, 4).map((item) => (
              <ProductCard key={item._id} product={item} />
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}
