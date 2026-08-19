import { adminRoute, assertObjectId, fail, ok, readJson } from "@/lib/api";
import Role from "@/models/Role";
import AdminUser from "@/models/AdminUser";
import { roleSchema } from "@/lib/validations/system";
import { ROLE_SLUGS } from "@/lib/permissions";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

export const PUT = adminRoute<{ id: string }>("roles.manage", async (request, { params, session }) => {
  const { id } = await params;
  assertObjectId(id);

  const payload = roleSchema.parse(await readJson<unknown>(request));
  const before = await Role.findById(id).lean();
  if (!before) return fail("Role not found", 404);

  // The super admin role must always keep every permission.
  if (before.slug === ROLE_SLUGS.SUPER_ADMIN) {
    return fail("The Super Admin role cannot be modified", 409);
  }

  const role = await Role.findByIdAndUpdate(
    id,
    { $set: { name: payload.name, description: payload.description, permissions: payload.permissions, status: payload.status } },
    { returnDocument: "after" },
  ).lean();

  await logActivity({
    session,
    action: "update",
    module: "roles",
    recordId: id,
    description: `Updated role "${before.name}"`,
    request,
    before,
    after: role,
  });

  return ok(role);
});

export const DELETE = adminRoute<{ id: string }>("roles.manage", async (request, { params, session }) => {
  const { id } = await params;
  assertObjectId(id);

  const role = await Role.findById(id).lean();
  if (!role) return fail("Role not found", 404);
  if (role.isSystem) return fail("Built-in roles cannot be deleted", 409);

  const inUse = await AdminUser.countDocuments({ role: id });
  if (inUse > 0) return fail(`This role is assigned to ${inUse} admin(s)`, 409);

  await Role.findByIdAndDelete(id);

  await logActivity({
    session,
    action: "delete",
    module: "roles",
    recordId: id,
    description: `Deleted role "${role.name}"`,
    request,
    before: role,
  });

  return ok({ deleted: true });
});
