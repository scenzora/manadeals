import type { Metadata } from "next";

import { storeMetadata } from "@/lib/tenant/seo";
import { ProductsView } from "@/components/site/products-view";
import { requireTenant, scopeCategoryIds, type HostParams } from "@/lib/tenant/page";

export const revalidate = 300;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: HostParams;
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const [tenant, query] = await Promise.all([requireTenant(params), searchParams]);
  return storeMetadata(tenant, {
    path: "/products",
    title: query.q ? `Search results for "${query.q}"` : "All products",
    // Filtered and paginated permutations are not worth indexing.
    extraNoIndex: Object.keys(query).length > 0,
  });
}

export default async function StoreProductsPage({
  params,
  searchParams,
}: {
  params: HostParams;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const tenant = await requireTenant(params);
  const categoryIds = await scopeCategoryIds(tenant.catalog.categories);
  return <ProductsView params={await searchParams} categoryIds={categoryIds} />;
}
