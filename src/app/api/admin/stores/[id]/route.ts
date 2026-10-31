import { z } from "zod";

import { adminRoute, assertObjectId, fail, ok, readJson } from "@/lib/api";
import { refreshStore } from "@/lib/tenant/store.server";
import { logActivity } from "@/services/activity-log.service";
import Tenant from "@/models/Tenant";
import TenantDomain from "@/models/TenantDomain";

export const runtime = "nodejs";

const updateSchema = z
  .object({
    status: z.enum(["active", "suspended"]).optional(),
    suspendedReason: z.string().trim().max(300).optional(),
    plan: z.enum(["free", "pro"]).optional(),
  })
  .refine((value) => value.status || value.plan, "Nothing to change");

/** Suspend / unsuspend a store, or move it between plans (until online billing exists). */
export const PATCH = adminRoute<{ id: string }>("stores.manage", async (request, { params, session }) => {
  const id = assertObjectId((await params).id);
  const input = updateSchema.parse(await readJson(request));

  const tenant = await Tenant.findById(id);
  if (!tenant) return fail("Store not found", 404);
  const before = { status: tenant.status, plan: tenant.plan };

  if (input.status === "suspended") {
    tenant.status = "suspended";
    tenant.suspendedReason = input.suspendedReason ?? "";
  } else if (input.status === "active") {
    tenant.status = "active";
    tenant.suspendedReason = "";
  }
  if (input.plan) {
    tenant.plan = input.plan;
    // An admin grant has no end date; billing sets one on each paid term.
    tenant.planExpiresAt = null;
  }
  await tenant.save();

  const domains = await TenantDomain.find({ tenant: id }).select("hostname").lean();
  refreshStore(id, tenant.slug, domains.flatMap((domain) => [domain.hostname, `www.${domain.hostname}`]));

  await logActivity({
    session,
    action: "update",
    module: "stores",
    recordId: id,
    description: `Store ${tenant.slug}: ${[input.status && `status → ${input.status}`, input.plan && `plan → ${input.plan}`].filter(Boolean).join(", ")}`,
    request,
    before,
    after: { status: tenant.status, plan: tenant.plan },
  });

  return ok({ id, status: tenant.status, plan: tenant.plan });
});
