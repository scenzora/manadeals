import "server-only";

import { redirect } from "next/navigation";

import connectToDatabase from "@/lib/mongodb";
import { getOwnerSession } from "@/lib/owner-auth";
import { ROOT_DOMAIN } from "@/lib/tenant/host";
import { sanitizeTheme, type TenantTheme } from "@/lib/tenant/theme";
import { normaliseSections, type SectionConfig } from "@/lib/tenant/sections";
import Tenant from "@/models/Tenant";

export type OwnerStore = {
  id: string;
  slug: string;
  name: string;
  plan: "free" | "pro";
  status: "draft" | "active" | "suspended";
  url: string;
  theme: TenantTheme;
  branding: {
    logoUrl: string;
    faviconUrl: string;
    tagline: string;
    footerText: string;
    contactEmail: string;
    showPoweredBy?: boolean;
    social: Record<string, string>;
  };
  affiliate: { amazonAssociateTag: string; flipkartAffiliateId: string; generic: { network: string; id: string }[] };
  catalog: { categories: string[]; dealOfTheDay: string | null; sections: SectionConfig[] };
};

const PROTOCOL = ROOT_DOMAIN === "localhost" ? "http" : "https";

/** Signed-in owner plus their store, as plain JSON. Redirects to login or onboarding when needed. */
export async function loadOwnerStore(options: { allowNoStore?: boolean } = {}) {
  const owner = await getOwnerSession();
  if (!owner) redirect("/dashboard/login");

  if (!owner.tenantId) {
    if (options.allowNoStore) return { owner, store: null };
    redirect("/dashboard/onboarding");
  }

  await connectToDatabase();
  const doc = await Tenant.findById(owner.tenantId).select("+affiliate").lean();
  if (!doc) redirect("/dashboard/onboarding");

  const store: OwnerStore = {
    id: String(doc._id),
    slug: doc.slug,
    name: doc.name,
    plan: doc.plan,
    status: doc.status,
    url: `${PROTOCOL}://${doc.slug}.${ROOT_DOMAIN}`,
    theme: sanitizeTheme(doc.theme),
    branding: JSON.parse(JSON.stringify(doc.branding ?? {})),
    affiliate: {
      amazonAssociateTag: doc.affiliate?.amazonAssociateTag ?? "",
      flipkartAffiliateId: doc.affiliate?.flipkartAffiliateId ?? "",
      generic: (doc.affiliate?.generic ?? []).map((entry) => ({ network: entry.network, id: entry.id })),
    },
    catalog: {
      categories: (doc.catalog?.categories ?? []).map(String),
      dealOfTheDay: doc.catalog?.dealOfTheDay ? String(doc.catalog.dealOfTheDay) : null,
      sections: normaliseSections(doc.catalog?.sections),
    },
  };
  return { owner, store };
}
