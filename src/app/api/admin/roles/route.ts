import { adminRoute, ok, readJson } from "@/lib/api";
import Role from "@/models/Role";
import AdminUser from "@/models/AdminUser";
import { roleSchema } from "@/lib/validations/system";
import { slugify } from "@/lib/utils/slug";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

export const GET = adminRoute(["admins.view", "roles.manage"], async () => {
  const roles = await Role.find({}).sort({ isSystem: -1, name: 1 }).lean();
  const counts = await AdminUser.aggregate<{ _id: unknown; count: number }>([
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((entry) => [String(entry._id), entry.count]));

  return ok(roles.map((role) => ({ ...role, adminCount: countMap.get(String(role._id)) ?? 0 })));
});

export const POST = adminRoute("roles.manage", async (request, { session }) => {
  const payload = roleSchema.parse(await readJson<unknown>(request));

  const role = await Role.create({ ...payload, slug: slugify(payload.name), isSystem: false });

  await logActivity({
    session,
    action: "create",
    module: "roles",
    recordId: String(role._id),
    description: `Created role "${role.name}"`,
    request,
    after: role.toObject(),
  });

  return ok(role.toObject(), 201);
});
