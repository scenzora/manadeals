import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import connectToDatabase from "@/lib/mongodb";
import Brand from "@/models/Brand";
import AffiliateNetwork from "@/models/AffiliateNetwork";
import { getCategoryBySlug, listProducts } from "@/services/storefront.service";
import { breadcrumbJsonLd, buildMetadata, JsonLd } from "@/lib/seo";
import { formatNumber } from "@/lib/utils/format";
import { ProductGrid } from "@/components/site/product-card";
import { ProductFilters } from "@/components/site/product-filters";
import { Breadcrumbs, Section, SiteEmptyState, SitePagination } from "@/components/site/ui";

export const revalidate = 300;

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryBySlug(slug);
  if (!data) return buildMetadata({ title: "Category not found", noIndex: true });

  return buildMetadata({
    title: `${data.category.name} deals and offers`,
    description:
      data.category.description ||
      `The best ${data.category.name.toLowerCase()} deals across Amazon, Flipkart and more, with real price history.`,
    path: `/category/${data.category.slug}`,
    image: data.category.image,
    seo: data.category.seo,
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const data = await getCategoryBySlug(slug);
  if (!data) notFound();

  const { category, children } = data;
  const page = Number(query.page) || 1;

  await connectToDatabase();
  const [result, brands, networks] = await Promise.all([
    listProducts({
      category: slug,
      brand: query.brand,
      network: query.network,
      minPrice: Number(query.min) || undefined,
      maxPrice: Number(query.max) || undefined,
      minDiscount: Number(query.discount) || undefined,
      sort: query.sort,
      page,
    }),
    Brand.find({ status: "active" }).select("name slug").sort({ name: 1 }).lean(),
    AffiliateNetwork.find({ status: "active" }).select("name code").sort({ name: 1 }).lean(),
  ]);

  function buildHref(nextPage: number) {
    const next = new URLSearchParams(
      Object.entries(query).filter(([, value]) => value) as [string, string][],
    );
    next.set("page", String(nextPage));
    return `/category/${slug}?${next.toString()}`;
  }

  const parent = category.parent as { name: string; slug: string } | null;

  return (
    <Section>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          ...(parent ? [{ name: parent.name, path: `/category/${parent.slug}` }] : []),
          { name: category.name, path: `/category/${category.slug}` },
        ])}
      />

      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          ...(parent ? [{ name: parent.name, href: `/category/${parent.slug}` }] : []),
          { name: category.name },
        ]}
      />

      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {category.description || `${formatNumber(result.total)} products with live prices`}
        </p>
      </div>

      {children.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {children.map((child) => (
            <Link
              key={String(child._id)}
              href={`/category/${child.slug}`}
              className="rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-1.5 text-sm transition-colors hover:border-[var(--primary)] hover:bg-[var(--accent)]"
            >
              {child.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside>
          <ProductFilters
            brands={brands.map((brand) => ({ value: brand.slug, label: brand.name }))}
            networks={networks.map((network) => ({ value: network.code, label: network.name }))}
            showCategoryNote={`Showing ${category.name}${children.length > 0 ? " and its subcategories" : ""}.`}
          />
        </aside>

        <div>
          {result.items.length === 0 ? (
            <SiteEmptyState
              title="Nothing here yet"
              description="We have not listed products in this category so far. Try another category."
              action={
                <Link
                  href="/products"
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white"
                >
                  Browse all products
                </Link>
              }
            />
          ) : (
            <>
              <ProductGrid products={result.items} />
              <SitePagination page={result.page} totalPages={result.totalPages} buildHref={buildHref} />
            </>
          )}
        </div>
      </div>
    </Section>
  );
}
