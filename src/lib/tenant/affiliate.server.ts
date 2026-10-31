import "server-only";

import connectToDatabase from "@/lib/mongodb";
import Tenant from "@/models/Tenant";
import { LruCache } from "@/lib/lru";
import { EMPTY_AFFILIATE, type TenantAffiliate } from "@/lib/affiliate/rewrite";

const cache = new LruCache<TenantAffiliate>(500, 60_000);

/**
 * Loads one tenant's affiliate ids. This is the only place that opts in to the
 * `select: false` fields, and it is keyed by the tenant id the host resolved to,
 * never by anything the visitor sends.
 */
export async function getTenantAffiliate(tenantId: string): Promise<TenantAffiliate> {
  const cached = cache.get(tenantId);
  if (cached) return cached;

  await connectToDatabase();
  const tenant = await Tenant.findById(tenantId).select("+affiliate").lean();
  const affiliate: TenantAffiliate = tenant
    ? {
        amazonAssociateTag: tenant.affiliate?.amazonAssociateTag ?? "",
        flipkartAffiliateId: tenant.affiliate?.flipkartAffiliateId ?? "",
        generic: (tenant.affiliate?.generic ?? []).map((entry) => ({ network: entry.network, id: entry.id })),
        custom: (tenant.affiliate?.custom ?? []).map((rule) => ({ ...rule })),
      }
    : EMPTY_AFFILIATE;

  cache.set(tenantId, affiliate);
  return affiliate;
}

/** Call after a store owner saves new ids so /go picks them up immediately. */
export function invalidateTenantAffiliate(tenantId: string) {
  cache.delete(tenantId);
}

/** Whether stores without their own tag fall back to ManaDeals' (default: yes). */
export const platformFallbackEnabled = () => process.env.AFFILIATE_FALLBACK_TO_PLATFORM !== "false";
