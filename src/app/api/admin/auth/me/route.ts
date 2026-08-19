import { adminRoute, ok } from "@/lib/api";

export const runtime = "nodejs";

export const GET = adminRoute(null, async (_request, { session }) => ok(session));
