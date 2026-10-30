import "server-only";

import connectToDatabase from "@/lib/mongodb";
import Tenant from "@/models/Tenant";
import TenantDomain from "@/models/TenantDomain";
import { ROOT_DOMAIN } from "@/lib/tenant/host";
import { sanitizeTheme } from "@/lib/tenant/theme";
import { createTenantResolver, type PublicTenant, type TenantLookup } from "@/lib/tenant/resolve";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPublicTenant(doc: any, primaryHostname: string): PublicTenant {
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
    primaryHostname,
  };
}

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
    return toPublicTenant(tenant, useCustom ? primary.hostname : `${tenant.slug}.${ROOT_DOMAIN}`);
  }

  // Custom domains only resolve once verified, and only for Pro stores.
  const domain = await TenantDomain.findOne({ hostname: target.hostname, verificationStatus: "verified" }).lean();
  if (!domain) return null;
  const tenant = await Tenant.findById(domain.tenant).lean();
  if (!tenant || tenant.plan !== "pro") return null;
  return toPublicTenant(tenant, target.hostname);
};

const globalWithResolver = globalThis as typeof globalThis & {
  __manadealsTenantResolver?: ReturnType<typeof createTenantResolver>;
};

/** Shared across hot reloads so the cache survives dev recompiles. */
export const tenantResolver =
  globalWithResolver.__manadealsTenantResolver ??
  (globalWithResolver.__manadealsTenantResolver = createTenantResolver(lookup));

export const resolveTenantByHost = (host: string) => tenantResolver.resolve(host);
