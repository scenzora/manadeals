import { adminRoute, ok } from "@/lib/api";
import { listStoresForAdmin } from "@/services/store-admin.service";

export const runtime = "nodejs";

export const GET = adminRoute("stores.view", async (request) => {
  const params = request.nextUrl.searchParams;
  return ok(
    await listStoresForAdmin({
      q: params.get("q")?.trim().slice(0, 60) || undefined,
      status: params.get("status") ?? undefined,
      page: Math.max(1, Number(params.get("page")) || 1),
      limit: Math.min(100, Math.max(1, Number(params.get("limit")) || 25)),
    }),
  );
});
