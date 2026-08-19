import { adminRoute, paginated } from "@/lib/api";
import User from "@/models/User";
import { asFilter, parseListQuery, sanitize, searchFilter } from "@/lib/utils/query";

export const runtime = "nodejs";

export const GET = adminRoute("users.view", async (request) => {
  const searchParams = request.nextUrl.searchParams;
  const { page, limit, search, sort, order } = parseListQuery(searchParams);

  const status = searchParams.get("status");
  const filter = {
    ...sanitize(status ? { status } : {}),
    ...searchFilter(search, ["name", "email", "phone"]),
  };

  const [items, total] = await Promise.all([
    User.find(asFilter(filter))
      .select("-passwordHash")
      .sort({ [sort]: order })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(asFilter(filter)),
  ]);

  return paginated(items, total, page, limit);
});
