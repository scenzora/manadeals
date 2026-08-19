import { adminRoute, ok } from "@/lib/api";
import Notification from "@/models/Notification";

export const runtime = "nodejs";

/** Feeds the header bell: the newest entries plus the unread count. */
export const GET = adminRoute(null, async (_request, { session }) => {
  const visibility = { $or: [{ recipient: null }, { recipient: session.id }] };

  const [items, unread] = await Promise.all([
    Notification.find(visibility).sort({ createdAt: -1 }).limit(8).lean(),
    Notification.countDocuments({ ...visibility, isRead: false }),
  ]);

  return ok({ items, unread });
});
