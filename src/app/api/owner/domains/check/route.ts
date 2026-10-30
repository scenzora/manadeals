import { ApiException, clientIp, ok } from "@/lib/api";
import { ownerRoute, tenantIdOf } from "@/lib/owner-api";
import { rateLimit } from "@/lib/rate-limit";
import { checkDomainNow } from "@/services/domain.service";

export const runtime = "nodejs";

/** The "Check DNS" button. Throttled because each call hits DNS and the hosting API. */
export const POST = ownerRoute(async (request, { owner }) => {
  const limit = rateLimit(`domain-check:${owner.id}:${clientIp(request)}`, 12, 10 * 60 * 1000);
  if (!limit.allowed) throw new ApiException(`Please wait ${limit.retryAfterSeconds}s before checking again.`, 429);

  return ok(await checkDomainNow(tenantIdOf(owner)));
});
