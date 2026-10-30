import { z } from "zod";

import { clientIp, ok, readJson } from "@/lib/api";
import { ApiException } from "@/lib/api";
import { ownerRoute, tenantIdOf } from "@/lib/owner-api";
import { rateLimit } from "@/lib/rate-limit";
import { limitsFor } from "@/lib/plans";
import { connectDomain, describeDomain, removeDomain } from "@/services/domain.service";
import Tenant from "@/models/Tenant";
import TenantDomain from "@/models/TenantDomain";

export const runtime = "nodejs";

export const GET = ownerRoute(async (_request, { owner }) => {
  const tenantId = tenantIdOf(owner);
  const [tenant, domain] = await Promise.all([
    Tenant.findById(tenantId).select("plan").lean(),
    TenantDomain.findOne({ tenant: tenantId }),
  ]);
  return ok({
    allowed: limitsFor(tenant?.plan ?? "free").customDomain,
    domain: domain ? describeDomain(domain) : null,
  });
});

const connectSchema = z.object({ hostname: z.string().trim().min(3).max(253) });

export const POST = ownerRoute(async (request, { owner }) => {
  const limit = rateLimit(`domain-connect:${owner.id}:${clientIp(request)}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) throw new ApiException("Too many attempts. Try again later.", 429);

  const { hostname } = connectSchema.parse(await readJson(request));
  const domain = await connectDomain(tenantIdOf(owner), hostname);
  return ok(describeDomain(domain), 201);
});

export const DELETE = ownerRoute(async (_request, { owner }) => {
  await removeDomain(tenantIdOf(owner));
  return ok({ removed: true });
});
