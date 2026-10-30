import { clientIp, fail, ok } from "@/lib/api";
import { ownerRoute } from "@/lib/owner-api";
import { rateLimit } from "@/lib/rate-limit";
import { validateStoreSlug } from "@/lib/tenant/identity";
import Tenant from "@/models/Tenant";

export const runtime = "nodejs";

/** Live availability check for the wizard's address field. */
export const GET = ownerRoute(async (request) => {
  const limit = rateLimit(`slug-check:${clientIp(request)}`, 60, 60_000);
  if (!limit.allowed) return fail("Slow down", 429);

  const slug = (request.nextUrl.searchParams.get("slug") ?? "").trim().toLowerCase();
  const verdict = validateStoreSlug(slug);
  if (!verdict.ok) return ok({ available: false, reason: verdict.reason });

  const taken = await Tenant.exists({ slug });
  return ok({ available: !taken, reason: taken ? "That address is already taken" : "" });
});
