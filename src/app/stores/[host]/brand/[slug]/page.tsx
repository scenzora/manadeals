import type { Metadata } from "next";

import BrandPage, { generateMetadata as mainBrandMetadata } from "@/app/(site)/brand/[slug]/page";
import { storeMetadata } from "@/lib/tenant/seo";
import { requireTenant, type HostParams } from "@/lib/tenant/page";

export const revalidate = 300;

type Params = HostParams & Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [tenant, { slug }] = await Promise.all([requireTenant(params), params]);
  const base = await mainBrandMetadata({ params });
  return {
    ...base,
    ...storeMetadata(tenant, {
      path: `/brand/${slug}`,
      title: typeof base.title === "string" ? base.title : undefined,
      description: base.description ?? undefined,
    }),
  };
}

export default BrandPage;
