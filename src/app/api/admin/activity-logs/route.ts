import { adminRoute, paginated } from "@/lib/api";
import ActivityLog from "@/models/ActivityLog";
import { asFilter, parseListQuery, sanitize, searchFilter } from "@/lib/utils/query";

export const runtime = "nodejs";

export const GET = adminRoute("activity-logs.view", async (request) => {
  const searchParams = request.nextUrl.searchParams;
  const { page, limit, search, sort, order } = parseListQuery(searchParams);

  const action = searchParams.get("action");
  const moduleName = searchParams.get("module");
  const admin = searchParams.get("admin");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const filter: Record<string, unknown> = sanitize({
    ...(action ? { action } : {}),
    ...(moduleName ? { module: moduleName } : {}),
    ...(admin ? { admin } : {}),
  });

  if (from || to) {
    filter.createdAt = {
      ...(from ? { $gte: new Date(from) } : {}),
      ...(to ? { $lte: new Date(to) } : {}),
    };
  }

  const query = { ...filter, ...searchFilter(search, ["adminName", "adminEmail", "description"]) };

  const [items, total] = await Promise.all([
    ActivityLog.find(asFilter(query))
      .sort({ [sort]: order })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(asFilter(query)),
  ]);

  return paginated(items, total, page, limit);
});
