import { fail, ok } from "@/lib/api";
import { ownerRoute, tenantIdOf } from "@/lib/owner-api";
import { checkBrandSafety } from "@/lib/tenant/identity";
import { refreshStore } from "@/lib/tenant/store.server";
import Tenant from "@/models/Tenant";

export const runtime = "nodejs";

/** Publishing re-checks the identity rules, in case a name was changed after signup. */
export const POST = ownerRoute(async (_request, { owner }) => {
  const tenantId = tenantIdOf(owner);
  const tenant = await Tenant.findById(tenantId).select("slug name status");
  if (!tenant) return fail("Store not found", 404);
  if (tenant.status === "suspended") return fail("This store is suspended. Contact support.", 403);

  const safety = checkBrandSafety(`${tenant.name} ${tenant.slug}`);
  if (!safety.ok) return fail(safety.reason, 422);

  tenant.status = "active";
  await tenant.save();
  refreshStore(tenantId, tenant.slug);
  return ok({ status: "active" });
});
