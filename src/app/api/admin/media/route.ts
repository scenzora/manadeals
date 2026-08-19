import { adminRoute, ok, paginated } from "@/lib/api";
import Media from "@/models/Media";
import { asFilter, parseListQuery, sanitize, searchFilter } from "@/lib/utils/query";
import { isR2Configured, r2ConfigurationIssue, R2_PUBLIC_URL } from "@/lib/r2";

export const runtime = "nodejs";

/** Media library listing. Pending (unfinished) uploads are hidden by default. */
export const GET = adminRoute("media.view", async (request) => {
  const searchParams = request.nextUrl.searchParams;
  const { page, limit, search, sort, order } = parseListQuery(searchParams, { limit: 24 });

  const folder = searchParams.get("folder");
  const includePending = searchParams.get("includePending") === "true";

  const filter = {
    ...sanitize({
      ...(folder ? { folder } : {}),
      ...(includePending ? {} : { status: "ready" }),
    }),
    ...searchFilter(search, ["filename", "alt", "tags"]),
  };

  const [items, total] = await Promise.all([
    Media.find(asFilter(filter))
      .sort({ [sort]: order })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Media.countDocuments(asFilter(filter)),
  ]);

  return paginated(items, total, page, limit);
});

/** Configuration probe, so the UI can explain a broken setup instead of failing. */
export const POST = adminRoute("media.view", async () =>
  ok({
    configured: isR2Configured,
    issue: r2ConfigurationIssue(),
    publicUrl: R2_PUBLIC_URL,
  }),
);
