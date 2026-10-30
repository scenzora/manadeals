import { notFound } from "next/navigation";

import ProductPage from "@/app/(site)/product/[slug]/page";
import { isProductInScope } from "@/services/storefront.service";
import { requireTenant, scopeCategoryIds, type HostParams } from "@/lib/tenant/page";

export const revalidate = 300;

export default async function StoreProductPage({
  params,
}: {
  params: HostParams & Promise<{ slug: string }>;
}) {
  const [tenant, { slug }] = await Promise.all([requireTenant(params), params]);
  const categoryIds = await scopeCategoryIds(tenant.catalog.categories);
  if (!(await isProductInScope(slug, categoryIds))) notFound();
  return <ProductPage params={params} />;
}
