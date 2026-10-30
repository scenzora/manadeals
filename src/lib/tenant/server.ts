import "server-only";

import connectToDatabase from "@/lib/mongodb";
import Tenant from "@/models/Tenant";
import { scoped } from "@/lib/tenant/scope";
import StoreBlogPost from "@/models/StoreBlogPost";
import TenantDomain from "@/models/TenantDomain";
import { ROOT_DOMAIN } from "@/lib/tenant/host";
import { sanitizeTheme } from "@/lib/tenant/theme";
import { managedHostnames } from "@/lib/domains/dns";
import { createTenantResolver, type PublicTenant, type TenantLookup } from "@/lib/tenant/resolve";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPublicTenant(doc: any, primaryHostname: string, publishedPosts: number, hasCustomDomain: boolean): PublicTenant {
  return {
    id: String(doc._id),
    slug: doc.slug,
    name: doc.name,
    plan: doc.plan,
    status: doc.status,
    theme: sanitizeTheme(doc.theme),
    branding: {
      logoUrl: doc.branding?.logoUrl ?? "",
      faviconUrl: doc.branding?.faviconUrl ?? "",
      tagline: doc.branding?.tagline ?? "",
      footerText: doc.branding?.footerText ?? "",
      contactEmail: doc.branding?.contactEmail ?? "",
      social: JSON.parse(JSON.stringify(doc.branding?.social ?? {})),
    },
    catalog: {
      categories: (doc.catalog?.categories ?? []).map(String),
      dealOfTheDay: doc.catalog?.dealOfTheDay ? String(doc.catalog.dealOfTheDay) : null,
      sections: (doc.catalog?.sections ?? []).map((entry: { key: string; enabled: boolean }) => ({
        key: entry.key,
        enabled: entry.enabled,
      })),
    },
    publishedPosts,
    hasCustomDomain,
    showPoweredBy: doc.branding?.showPoweredBy !== false,
    primaryHostname,
  };
}

const countPosts = (tenantId: unknown) =>
  scoped(StoreBlogPost, String(tenantId)).countDocuments({ status: "published" });

const lookup: TenantLookup = async (target) => {
  await connectToDatabase();

  if (target.kind === "subdomain") {
    const tenant = await Tenant.findOne({ slug: target.slug }).lean();
    if (!tenant) return null;
    const primary = await TenantDomain.findOne({
      tenant: tenant._id,
      isPrimary: true,
      verificationStatus: "verified",
    })
      .select("hostname")
      .lean();
    // A Pro store with a verified primary domain reports that as canonical.
    const useCustom = tenant.plan === "pro" && primary;
    return toPublicTenant(
      tenant,
      useCustom ? managedHostnames(primary.hostname).primary : `${tenant.slug}.${ROOT_DOMAIN}`,
      await countPosts(tenant._id),
      Boolean(useCustom),
    );
  }

  // Custom domains only resolve once verified, and only for Pro stores.
  const domain = await TenantDomain.findOne({ hostname: target.hostname, verificationStatus: "verified" }).lean();
  if (!domain) return null;
  const tenant = await Tenant.findById(domain.tenant).lean();
  if (!tenant || tenant.plan !== "pro") return null;
  return toPublicTenant(tenant, managedHostnames(target.hostname).primary, await countPosts(tenant._id), true);
};

const globalWithResolver = globalThis as typeof globalThis & {
  __manadealsTenantResolver?: ReturnType<typeof createTenantResolver>;
};

/** Shared across hot reloads so the cache survives dev recompiles. */
export const tenantResolver =
  globalWithResolver.__manadealsTenantResolver ??
  (globalWithResolver.__manadealsTenantResolver = createTenantResolver(lookup));

export const resolveTenantByHost = (host: string) => tenantResolver.resolve(host);
