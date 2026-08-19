import { adminRoute, assertObjectId, fail, ok, readJson } from "@/lib/api";
import AdminUser from "@/models/AdminUser";
import Role from "@/models/Role";
import { adminUserUpdateSchema } from "@/lib/validations/system";
import { hashPassword } from "@/lib/auth";
import { ROLE_SLUGS } from "@/lib/permissions";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

/** Refuses to remove or demote the final active super admin. */
async function isLastSuperAdmin(adminId: string) {
  const superAdminRole = await Role.findOne({ slug: ROLE_SLUGS.SUPER_ADMIN }).select("_id").lean();
  if (!superAdminRole) return false;

  const admin = await AdminUser.findById(adminId).select("role").lean();
  if (!admin || String(admin.role) !== String(superAdminRole._id)) return false;

  const count = await AdminUser.countDocuments({ role: superAdminRole._id, status: "active" });
  return count <= 1;
}

export const GET = adminRoute<{ id: string }>("admins.view", async (_request, { params }) => {
  const { id } = await params;
  assertObjectId(id);

  const admin = await AdminUser.findById(id)
    .populate({ path: "role", model: Role, select: "name slug permissions" })
    .lean();

  if (!admin) return fail("Admin not found", 404);
  return ok(admin);
});

export const PUT = adminRoute<{ id: string }>("admins.manage", async (request, { params, session }) => {
  const { id } = await params;
  assertObjectId(id);

  const payload = adminUserUpdateSchema.parse(await readJson<unknown>(request));
  const before = await AdminUser.findById(id).lean();
  if (!before) return fail("Admin not found", 404);

  const demoting = payload.role && String(payload.role) !== String(before.role);
  const deactivating = payload.status && payload.status !== "active";
  if ((demoting || deactivating) && (await isLastSuperAdmin(id))) {
    return fail("You cannot demote or deactivate the last active super admin", 409);
  }

  const update: Record<string, unknown> = { ...payload };
  delete update.password;
  if (payload.email) update.email = payload.email.toLowerCase();
  if (payload.password && payload.password !== "") {
    update.passwordHash = await hashPassword(payload.password);
    update.tokenVersion = (before.tokenVersion ?? 0) + 1; // sign the admin out everywhere
  }

  const admin = await AdminUser.findByIdAndUpdate(id, { $set: update }, { returnDocument: "after" })
    .populate({ path: "role", model: Role, select: "name slug" })
    .lean();

  await logActivity({
    session,
    action: "update",
    module: "admin-users",
    recordId: id,
    description: `Updated admin "${before.email}"`,
    request,
    before,
    after: admin,
  });

  return ok(admin);
});

export const DELETE = adminRoute<{ id: string }>(
  "admins.manage",
  async (request, { params, session }) => {
    const { id } = await params;
    assertObjectId(id);

    if (id === session.id) return fail("You cannot delete your own account", 409);
    if (await isLastSuperAdmin(id)) return fail("You cannot delete the last super admin", 409);

    const admin = await AdminUser.findByIdAndDelete(id).lean();
    if (!admin) return fail("Admin not found", 404);

    await logActivity({
      session,
      action: "delete",
      module: "admin-users",
      recordId: id,
      description: `Deleted admin "${admin.email}"`,
      request,
      before: admin,
    });

    return ok({ deleted: true });
  },
);
