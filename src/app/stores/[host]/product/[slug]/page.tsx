import { notFound } from "next/navigation";

import type { Metadata } from "next";

import ProductPage, { generateMetadata as mainProductMetadata } from "@/app/(site)/product/[slug]/page";
import { storeMetadata } from "@/lib/tenant/seo";
import { isProductInScope } from "@/services/storefront.service";
import { requireTenant, scopeCategoryIds, type HostParams } from "@/lib/tenant/page";

export const revalidate = 300;

type Params = HostParams & Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [tenant, { slug }] = await Promise.all([requireTenant(params), params]);
  const base = await mainProductMetadata({ params });
  return {
    ...base,
    ...storeMetadata(tenant, {
      path: `/product/${slug}`,
      kind: "product",
      title: typeof base.title === "string" ? base.title : undefined,
      description: base.description ?? undefined,
    }),
  };
}

export default async function StoreProductPage({
  params,
}: {
  params: Params;
}) {
  const [tenant, { slug }] = await Promise.all([requireTenant(params), params]);
  const categoryIds = await scopeCategoryIds(tenant.catalog.categories);
  if (!(await isProductInScope(slug, categoryIds))) notFound();
  return <ProductPage params={params} />;
}
