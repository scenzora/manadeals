import { notFound } from "next/navigation";

import type { Metadata } from "next";

import CategoryPage, { generateMetadata as mainCategoryMetadata } from "@/app/(site)/category/[slug]/page";
import { storeMetadata } from "@/lib/tenant/seo";
import { getCategoryBySlug } from "@/services/storefront.service";
import { requireTenant, scopeCategoryIds, type HostParams } from "@/lib/tenant/page";
import { getProductsInOrder } from "@/services/storefront.service";
import { ProductGrid } from "@/components/site/product-card";
import { Section, SectionHeading, SiteEmptyState } from "@/components/site/ui";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: HostParams & Promise<{ slug: string }> }): Promise<Metadata> {
  const [tenant, { slug }] = await Promise.all([requireTenant(params), params]);
  const collection = (tenant.collections ?? []).find((entry) => entry.slug === slug);
  if (collection) {
    return storeMetadata(tenant, { path: `/category/${slug}`, title: collection.name, description: `${collection.name} picks from ${tenant.name}.` });
  }
  const base = await mainCategoryMetadata({ params });
  return {
    ...base,
    ...storeMetadata(tenant, {
      path: `/category/${slug}`,
      title: typeof base.title === "string" ? base.title : undefined,
      description: base.description ?? undefined,
    }),
  };
}

export default async function StoreCategoryPage({
  params,
  searchParams,
}: {
  params: HostParams & Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [tenant, { slug }] = await Promise.all([requireTenant(params), params]);
  // An owner-made category wins over a shared one with the same slug.
  const collection = (tenant.collections ?? []).find((entry) => entry.slug === slug);
  if (collection) {
    const products = await getProductsInOrder(collection.products, tenant.id);
    return (
      <Section>
        <SectionHeading title={collection.name} subtitle={`${products.length} products`} />
        {products.length > 0 ? <ProductGrid products={products} /> : <SiteEmptyState title="Nothing here yet" description="Check back soon." />}
      </Section>
    );
  }

  const allowed = await scopeCategoryIds(tenant.catalog.categories);

  if (allowed.length > 0) {
    const data = await getCategoryBySlug(slug);
    if (!data || !allowed.includes(String(data.category._id))) notFound();
  }
  return <CategoryPage params={params} searchParams={searchParams} tenantId={tenant.id} />;
}
