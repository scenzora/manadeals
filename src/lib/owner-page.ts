import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import connectToDatabase from "@/lib/mongodb";
import { getOwnerSession } from "@/lib/owner-auth";
import { ROOT_DOMAIN } from "@/lib/tenant/host";
import { sanitizeTheme, type TenantTheme } from "@/lib/tenant/theme";
import { normaliseSections, type SectionConfig } from "@/lib/tenant/sections";
import type { CustomRule } from "@/lib/affiliate/rewrite";
import Product from "@/models/Product";
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
  affiliate: {
    amazonAssociateTag: string;
    flipkartAffiliateId: string;
    generic: { network: string; id: string }[];
    custom: CustomRule[];
  };
  collections: { slug: string; name: string; products: { id: string; name: string }[] }[];
  catalog: { categories: string[]; dealOfTheDay: string | null; sections: SectionConfig[] };
};

const PROTOCOL = ROOT_DOMAIN === "localhost" ? "http" : "https";

/** In local development the store link must carry the dev server's port (e.g. demo.localhost:3001). */
async function devPort() {
  if (ROOT_DOMAIN !== "localhost") return "";
  const host = (await headers()).get("host") ?? "";
  const port = host.split(":")[1];
  return port ? `:${port}` : "";
}

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

  const collectionIds = (doc.collections ?? []).flatMap((entry) => entry.products.map(String));
  const names = new Map(
    (await Product.find({ _id: { $in: collectionIds }, tenant: { $in: [null, doc._id] } }).select("name").lean()).map((p) => [String(p._id), p.name]),
  );

  const store: OwnerStore = {
    id: String(doc._id),
    slug: doc.slug,
    name: doc.name,
    plan: doc.plan,
    status: doc.status,
    url: `${PROTOCOL}://${doc.slug}.${ROOT_DOMAIN}${await devPort()}`,
    theme: sanitizeTheme(doc.theme),
    branding: JSON.parse(JSON.stringify(doc.branding ?? {})),
    affiliate: {
      amazonAssociateTag: doc.affiliate?.amazonAssociateTag ?? "",
      flipkartAffiliateId: doc.affiliate?.flipkartAffiliateId ?? "",
      generic: (doc.affiliate?.generic ?? []).map((entry) => ({ network: entry.network, id: entry.id })),
      custom: (doc.affiliate?.custom ?? []).map((rule) => ({ ...rule })),
    },
    collections: (doc.collections ?? []).map((entry) => ({
      slug: entry.slug,
      name: entry.name,
      products: entry.products.map((id) => ({ id: String(id), name: names.get(String(id)) ?? "Unavailable product" })),
    })),
    catalog: {
      categories: (doc.catalog?.categories ?? []).map(String),
      dealOfTheDay: doc.catalog?.dealOfTheDay ? String(doc.catalog.dealOfTheDay) : null,
      sections: normaliseSections(doc.catalog?.sections),
    },
  };
  return { owner, store };
}
