import "server-only";

import { notFound } from "next/navigation";

import { expandCategoryIds } from "@/services/storefront.service";
import { resolveTenantByHost } from "@/lib/tenant/server";

export type HostParams = Promise<{ host: string }>;

/** Resolves the tenant for a `/stores/[host]` page. The layout already redirects unknown hosts. */
export async function requireTenant(params: HostParams) {
  const { host } = await params;
  const tenant = await resolveTenantByHost(decodeURIComponent(host));
  if (!tenant) notFound();
  return tenant;
}

/** The store's chosen categories plus their children; empty means no restriction. */
export const scopeCategoryIds = (categories: string[]) => expandCategoryIds(categories);
