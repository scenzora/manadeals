import { ApiException, fail, ok, readJson } from "@/lib/api";
import { ownerRoute, tenantIdOf } from "@/lib/owner-api";
import { keyFromPublicUrl } from "@/lib/r2";
import { limitsFor } from "@/lib/plans";
import { defaultSections } from "@/lib/tenant/sections";
import { refreshStore } from "@/lib/tenant/store.server";
import { sanitizeTheme } from "@/lib/tenant/theme";
import { createStoreSchema, updateStoreSchema } from "@/lib/validations/store";
import StoreOwner from "@/models/StoreOwner";
import Tenant from "@/models/Tenant";

export const runtime = "nodejs";

/** Logo and favicon URLs must point at our own bucket, so a store cannot hotlink arbitrary hosts. */
function ownImageOrBlank(url: string) {
  if (url && !keyFromPublicUrl(url)) throw new ApiException("Images must be uploaded through the dashboard", 422);
  return url;
}

/** Creates the owner's store (wizard step 1). One store per owner. */
export const POST = ownerRoute(async (request, { owner }) => {
  if (owner.tenantId) return fail("You already have a store", 409);

  const input = createStoreSchema.parse(await readJson(request));
  if (await Tenant.exists({ slug: input.slug })) return fail("That address is already taken", 409);

  const tenant = await Tenant.create({
    slug: input.slug,
    name: input.name.trim(),
    owner: owner.id,
    status: "draft",
    catalog: { sections: defaultSections() },
  });
  await StoreOwner.updateOne({ _id: owner.id }, { tenant: tenant._id });

  return ok({ id: String(tenant._id), slug: tenant.slug }, 201);
});

/** Saves one section of the store's settings. */
export const PATCH = ownerRoute(async (request, { owner }) => {
  const tenantId = tenantIdOf(owner);
  const input = updateStoreSchema.parse(await readJson(request));

  const tenant = await Tenant.findById(tenantId).select("slug plan");
  if (!tenant) return fail("Store not found", 404);

  let update: Record<string, unknown>;

  switch (input.section) {
    case "branding":
      update = {
        name: input.name.trim(),
        "branding.tagline": input.tagline,
        "branding.footerText": input.footerText,
        "branding.contactEmail": input.contactEmail,
        "branding.logoUrl": ownImageOrBlank(input.logoUrl),
        "branding.faviconUrl": ownImageOrBlank(input.faviconUrl),
        "branding.social": input.social,
      };
      break;
    case "theme": {
      const { section: _section, ...theme } = input;
      void _section;
      update = { theme: sanitizeTheme(theme) };
      break;
    }
    case "affiliate":
      update = {
        "affiliate.amazonAssociateTag": input.amazonAssociateTag,
        "affiliate.flipkartAffiliateId": input.flipkartAffiliateId,
        "affiliate.generic": input.generic,
      };
      break;
    case "catalog": {
      const enabled = input.sections.filter((entry) => entry.enabled).length;
      const allowed = limitsFor(tenant.plan).homeSections;
      if (enabled > allowed) {
        return fail(`Your plan allows ${allowed} home page sections. Upgrade to Pro to show more.`, 403);
      }
      update = {
        "catalog.categories": input.categories,
        "catalog.dealOfTheDay": input.dealOfTheDay,
        "catalog.sections": input.sections,
      };
      break;
    }
  }

  await Tenant.updateOne({ _id: tenantId }, { $set: update });
  refreshStore(tenantId, tenant.slug);
  return ok({ saved: input.section });
});
