import type { NextRequest } from "next/server";

import connectToDatabase from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { hashPassword, hashResetToken } from "@/lib/auth";
import { clientIp, fail, handleRouteError, ok, readJson } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(`reset:${clientIp(request)}`, 10, 15 * 60 * 1000);
    if (!limited.allowed) return fail("Too many attempts. Please try again later.", 429);

    const { token, password } = resetPasswordSchema.parse(await readJson<unknown>(request));

    await connectToDatabase();
    const admin = await AdminUser.findOne({
      resetTokenHash: hashResetToken(token),
      resetTokenExpiresAt: { $gt: new Date() },
    }).select("+resetTokenHash +resetTokenExpiresAt");

    if (!admin) return fail("This reset link is invalid or has expired.", 400);

    admin.passwordHash = await hashPassword(password);
    admin.resetTokenHash = null;
    admin.resetTokenExpiresAt = null;
    admin.failedLoginAttempts = 0;
    admin.lockedUntil = null;
    admin.tokenVersion = (admin.tokenVersion ?? 0) + 1; // invalidate existing sessions
    await admin.save();

    await logActivity({
      session: { id: String(admin._id), name: admin.name, email: admin.email },
      action: "update",
      module: "auth",
      recordId: String(admin._id),
      description: "Password reset via email link",
      request,
    });

    return ok({ message: "Password updated. You can now sign in." });
  } catch (error) {
    return handleRouteError(error);
  }
}
