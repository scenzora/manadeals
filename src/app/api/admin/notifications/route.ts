import { adminRoute, ok, paginated, readJson } from "@/lib/api";
import Notification from "@/models/Notification";
import { asFilter, parseListQuery, sanitize, searchFilter } from "@/lib/utils/query";
import { notificationSchema } from "@/lib/validations/system";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

export const GET = adminRoute("notifications.view", async (request, { session }) => {
  const searchParams = request.nextUrl.searchParams;
  const { page, limit, search, sort, order } = parseListQuery(searchParams);

  const type = searchParams.get("type");
  const unreadOnly = searchParams.get("unread") === "true";

  const filter = {
    // Broadcasts (recipient: null) are visible to every admin.
    $or: [{ recipient: null }, { recipient: session.id }],
    ...sanitize({ ...(type ? { type } : {}), ...(unreadOnly ? { isRead: false } : {}) }),
    ...searchFilter(search, ["title", "message"]),
  };

  const [items, total] = await Promise.all([
    Notification.find(asFilter(filter))
      .sort({ [sort]: order })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(asFilter(filter)),
  ]);

  return paginated(items, total, page, limit);
});

export const POST = adminRoute("notifications.manage", async (request, { session }) => {
  const payload = notificationSchema.parse(await readJson<unknown>(request));
  const notification = await Notification.create(payload);

  await logActivity({
    session,
    action: "create",
    module: "notifications",
    recordId: String(notification._id),
    description: `Created notification "${notification.title}"`,
    request,
  });

  return ok(notification.toObject(), 201);
});
