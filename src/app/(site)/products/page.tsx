import type { Metadata } from "next";

import connectToDatabase from "@/lib/mongodb";
import Brand from "@/models/Brand";
import AffiliateNetwork from "@/models/AffiliateNetwork";
import { listProducts } from "@/services/storefront.service";
import { buildMetadata } from "@/lib/seo";
import { formatNumber } from "@/lib/utils/format";
import { ProductGrid } from "@/components/site/product-card";
import { ProductFilters } from "@/components/site/product-filters";
import { Breadcrumbs, Section, SiteEmptyState, SitePagination } from "@/components/site/ui";

export const revalidate = 300;

type SearchParams = Promise<Record<string, string | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q;

  return buildMetadata({
    title: query ? `Search results for "${query}"` : "All products",
    description: query
      ? `Deals and prices for "${query}" across Amazon, Flipkart and more.`
      : "Browse every product we track, with live prices and real discounts.",
    path: "/products",
    // Filtered and paginated permutations are not worth indexing.
    noIndex: Object.keys(params).length > 0,
  });
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  await connectToDatabase();
  const [result, brands, networks] = await Promise.all([
    listProducts({
      q: params.q,
      brand: params.brand,
      network: params.network,
      minPrice: Number(params.min) || undefined,
      maxPrice: Number(params.max) || undefined,
      minDiscount: Number(params.discount) || undefined,
      sort: params.sort,
      page,
    }),
    Brand.find({ status: "active" }).select("name slug").sort({ name: 1 }).lean(),
    AffiliateNetwork.find({ status: "active" }).select("name code").sort({ name: 1 }).lean(),
  ]);

  function buildHref(nextPage: number) {
    const next = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value) as [string, string][],
    );
    next.set("page", String(nextPage));
    return `/products?${next.toString()}`;
  }

  return (
    <Section>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Products" }]} />

      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {params.q ? `Results for "${params.q}"` : "All products"}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {formatNumber(result.total)} product{result.total === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside>
          <ProductFilters
            brands={brands.map((brand) => ({ value: brand.slug, label: brand.name }))}
            networks={networks.map((network) => ({ value: network.code, label: network.name }))}
          />
        </aside>

        <div>
          {result.items.length === 0 ? (
            <SiteEmptyState
              title="No products match those filters"
              description="Try widening the price range or clearing a filter."
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
