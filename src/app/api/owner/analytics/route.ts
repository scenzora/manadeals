import { ok } from "@/lib/api";
import { ownerRoute, tenantIdOf } from "@/lib/owner-api";
import { getStoreAnalytics } from "@/services/store-analytics.service";
import Tenant from "@/models/Tenant";

export const runtime = "nodejs";

export const GET = ownerRoute(async (request, { owner }) => {
  const tenantId = tenantIdOf(owner);
  const tenant = await Tenant.findById(tenantId).select("plan").lean();
  const days = Number(request.nextUrl.searchParams.get("days")) || 30;
  return ok(await getStoreAnalytics(tenantId, tenant?.plan ?? "free", days));
});
