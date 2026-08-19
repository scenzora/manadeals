import { adminRoute, fail, ok, readJson } from "@/lib/api";
import AdminUser from "@/models/AdminUser";
import { changePasswordSchema } from "@/lib/validations/auth";
import { hashPassword, setSessionCookie, signSessionToken, verifyPassword } from "@/lib/auth";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

/** Updates the signed-in admin's own name/phone/avatar. */
export const PUT = adminRoute(null, async (request, { session }) => {
  const body = await readJson<{ name?: string; phone?: string; avatar?: string }>(request);

  const admin = await AdminUser.findByIdAndUpdate(
    session.id,
    {
      $set: {
        ...(body.name ? { name: body.name.slice(0, 80) } : {}),
        ...(body.phone !== undefined ? { phone: body.phone.slice(0, 20) } : {}),
        ...(body.avatar !== undefined ? { avatar: body.avatar.slice(0, 300) } : {}),
      },
    },
    { returnDocument: "after" },
  ).lean();

  if (!admin) return fail("Account not found", 404);

  await logActivity({
    session,
    action: "update",
    module: "profile",
    recordId: session.id,
    description: "Updated own profile",
    request,
  });

  return ok({ name: admin.name, phone: admin.phone, avatar: admin.avatar });
});

/** Changes the signed-in admin's password and re-issues their session. */
export const POST = adminRoute(null, async (request, { session }) => {
  const payload = changePasswordSchema.parse(await readJson<unknown>(request));

  const admin = await AdminUser.findById(session.id).select("+passwordHash");
  if (!admin) return fail("Account not found", 404);

  const matches = await verifyPassword(payload.currentPassword, admin.passwordHash);
  if (!matches) return fail("Your current password is incorrect", 401);

  admin.passwordHash = await hashPassword(payload.password);
  admin.tokenVersion = (admin.tokenVersion ?? 0) + 1;
  await admin.save();

  // Keep this session alive with a token carrying the new version.
  await setSessionCookie(
    signSessionToken({ sub: String(admin._id), tokenVersion: admin.tokenVersion }, false),
    false,
  );

  await logActivity({
    session,
    action: "update",
    module: "profile",
    recordId: session.id,
    description: "Changed own password",
    request,
  });

  return ok({ changed: true });
});
