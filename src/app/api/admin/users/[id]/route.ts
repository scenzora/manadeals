import { adminRoute, assertObjectId, fail, ok, readJson } from "@/lib/api";
import User from "@/models/User";
import Click from "@/models/Click";
import { userUpdateSchema } from "@/lib/validations/system";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

/** User profile plus their favourites and recent affiliate clicks. */
export const GET = adminRoute<{ id: string }>("users.view", async (_request, { params }) => {
  const { id } = await params;
  assertObjectId(id);

  const user = await User.findById(id)
    .select("-passwordHash")
    .populate({ path: "favorites", select: "name slug thumbnail salePrice" })
    .lean();

  if (!user) return fail("User not found", 404);

  const clicks = await Click.find({ user: id })
    .sort({ clickedAt: -1 })
    .limit(25)
    .populate({ path: "product", select: "name slug" })
    .populate({ path: "affiliateNetwork", select: "name" })
    .lean();

  return ok({ user, clicks });
});

export const PUT = adminRoute<{ id: string }>("users.edit", async (request, { params, session }) => {
  const { id } = await params;
  assertObjectId(id);

  const payload = userUpdateSchema.parse(await readJson<unknown>(request));
  const before = await User.findById(id).lean();
  if (!before) return fail("User not found", 404);

  const user = await User.findByIdAndUpdate(id, { $set: payload }, { returnDocument: "after" })
    .select("-passwordHash")
    .lean();

  await logActivity({
    session,
    action: "update",
    module: "users",
    recordId: id,
    description: `Updated user "${before.email}"`,
    request,
    before,
    after: user,
  });

  return ok(user);
});

export const DELETE = adminRoute<{ id: string }>("users.delete", async (request, { params, session }) => {
  const { id } = await params;
  assertObjectId(id);

  const user = await User.findByIdAndDelete(id).lean();
  if (!user) return fail("User not found", 404);

  await logActivity({
    session,
    action: "delete",
    module: "users",
    recordId: id,
    description: `Deleted user "${user.email}"`,
    request,
    before: user,
  });

  return ok({ deleted: true });
});
