import type { Metadata } from "next";

import MainPage from "@/app/(site)/deals/page";
import { storeMetadata } from "@/lib/tenant/seo";
import { requireTenant, type HostParams } from "@/lib/tenant/page";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: HostParams }): Promise<Metadata> {
  const tenant = await requireTenant(params);
  return storeMetadata(tenant, { path: "/deals", title: "Today's deals", description: `Live deals picked by ${tenant.name}.` });
}

export default MainPage;
