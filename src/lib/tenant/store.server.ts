import "server-only";

import { revalidatePath } from "next/cache";

import { ROOT_DOMAIN } from "@/lib/tenant/host";
import { tenantResolver } from "@/lib/tenant/server";
import { invalidateTenantAffiliate } from "@/lib/tenant/affiliate.server";

/**
 * Call after any change to a store: drops the cached tenant, cached affiliate
 * ids and the rendered pages for every host the store answers on.
 */
export function refreshStore(tenantId: string, slug: string, extraHosts: string[] = []) {
  invalidateTenantAffiliate(tenantId);
  for (const host of [`${slug}.${ROOT_DOMAIN}`, ...extraHosts]) {
    tenantResolver.invalidate(host);
    revalidatePath(`/stores/${host}`, "layout");
  }
}
