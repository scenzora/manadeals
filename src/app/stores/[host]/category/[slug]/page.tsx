import { notFound } from "next/navigation";

import type { Metadata } from "next";

import CategoryPage, { generateMetadata as mainCategoryMetadata } from "@/app/(site)/category/[slug]/page";
import { storeMetadata } from "@/lib/tenant/seo";
import { getCategoryBySlug } from "@/services/storefront.service";
import { requireTenant, scopeCategoryIds, type HostParams } from "@/lib/tenant/page";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: HostParams & Promise<{ slug: string }> }): Promise<Metadata> {
  const [tenant, { slug }] = await Promise.all([requireTenant(params), params]);
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
  const allowed = await scopeCategoryIds(tenant.catalog.categories);

  if (allowed.length > 0) {
    const data = await getCategoryBySlug(slug);
    if (!data || !allowed.includes(String(data.category._id))) notFound();
  }
  return <CategoryPage params={params} searchParams={searchParams} />;
}
