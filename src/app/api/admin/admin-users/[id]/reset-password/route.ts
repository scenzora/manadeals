import { adminRoute, assertObjectId, fail, ok, readJson } from "@/lib/api";
import AdminUser from "@/models/AdminUser";
import { adminResetPasswordSchema } from "@/lib/validations/system";
import { hashPassword } from "@/lib/auth";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

/** Super-admin initiated password reset; signs the target admin out everywhere. */
export const POST = adminRoute<{ id: string }>(
  "admins.manage",
  async (request, { params, session }) => {
    const { id } = await params;
    assertObjectId(id);

    const { password } = adminResetPasswordSchema.parse(await readJson<unknown>(request));
    const admin = await AdminUser.findById(id);
    if (!admin) return fail("Admin not found", 404);

    admin.passwordHash = await hashPassword(password);
    admin.tokenVersion = (admin.tokenVersion ?? 0) + 1;
    admin.failedLoginAttempts = 0;
    admin.lockedUntil = null;
    await admin.save();

    await logActivity({
      session,
      action: "update",
      module: "admin-users",
      recordId: id,
      description: `Reset password for admin "${admin.email}"`,
      request,
    });

    return ok({ reset: true });
  },
);
