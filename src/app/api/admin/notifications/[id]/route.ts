import { adminRoute, assertObjectId, fail, ok } from "@/lib/api";
import Notification from "@/models/Notification";

export const runtime = "nodejs";

/** Marks a notification read. */
export const PATCH = adminRoute<{ id: string }>("notifications.view", async (_request, { params }) => {
  const { id } = await params;
  assertObjectId(id);

  const notification = await Notification.findByIdAndUpdate(
    id,
    { $set: { isRead: true, readAt: new Date() } },
    { returnDocument: "after" },
  ).lean();

  if (!notification) return fail("Notification not found", 404);
  return ok(notification);
});

export const DELETE = adminRoute<{ id: string }>("notifications.manage", async (_request, { params }) => {
  const { id } = await params;
  assertObjectId(id);

  const notification = await Notification.findByIdAndDelete(id).lean();
  if (!notification) return fail("Notification not found", 404);
  return ok({ deleted: true });
});
