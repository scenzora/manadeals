import { ApiException, clientIp, ok } from "@/lib/api";
import { ownerRoute, tenantIdOf } from "@/lib/owner-api";
import { rateLimit } from "@/lib/rate-limit";
import { createProOrder } from "@/services/billing.service";

export const runtime = "nodejs";

/** Starts checkout for a Pro term (first purchase or renewal). */
export const POST = ownerRoute(async (request, { owner }) => {
  const limit = rateLimit(`billing-order:${owner.id}:${clientIp(request)}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) throw new ApiException("Too many attempts. Try again later.", 429);
  return ok(await createProOrder(tenantIdOf(owner), owner.id));
});
