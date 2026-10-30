import { ProductsView } from "@/components/site/products-view";
import { requireTenant, scopeCategoryIds, type HostParams } from "@/lib/tenant/page";

export const revalidate = 300;

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
