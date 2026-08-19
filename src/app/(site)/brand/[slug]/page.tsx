import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getBrandBySlug, listProducts } from "@/services/storefront.service";
import { buildMetadata } from "@/lib/seo";
import { formatNumber } from "@/lib/utils/format";
import { ProductGrid } from "@/components/site/product-card";
import { Breadcrumbs, Section, SiteEmptyState, SitePagination } from "@/components/site/ui";

export const revalidate = 300;

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return buildMetadata({ title: "Brand not found", noIndex: true });

  return buildMetadata({
    title: `${brand.name} deals and offers`,
    description:
      brand.description || `Live prices and discounts on ${brand.name} products across every store we track.`,
    path: `/brand/${brand.slug}`,
    image: brand.logo,
    seo: brand.seo,
  });
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  const page = Number(query.page) || 1;
  const result = await listProducts({ brand: slug, sort: query.sort, page });

  return (
    <Section>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: brand.name }]} />

      <div className="mb-6 flex items-center gap-4">
        {brand.logo ? (
          <span className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-white">
            <Image src={brand.logo} alt={brand.name} fill sizes="64px" className="object-contain p-2" unoptimized />
          </span>
        ) : null}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{brand.name}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {brand.description || `${formatNumber(result.total)} products tracked`}
          </p>
        </div>
      </div>

      {result.items.length === 0 ? (
        <SiteEmptyState title="No products from this brand yet" />
      ) : (
        <>
          <ProductGrid products={result.items} />
          <SitePagination
            page={result.page}
            totalPages={result.totalPages}
            buildHref={(nextPage) => `/brand/${slug}?page=${nextPage}`}
          />
        </>
      )}
    </Section>
  );
}
