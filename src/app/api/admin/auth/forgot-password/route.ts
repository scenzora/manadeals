import type { NextRequest } from "next/server";

import connectToDatabase from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { createResetToken } from "@/lib/auth";
import { clientIp, fail, handleRouteError, ok, readJson } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const RESET_TTL_MINUTES = 30;

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(`forgot:${clientIp(request)}`, 5, 15 * 60 * 1000);
    if (!limited.allowed) {
      return fail("Too many reset requests. Please try again later.", 429);
    }

    const { email } = forgotPasswordSchema.parse(await readJson<unknown>(request));

    await connectToDatabase();
    const admin = await AdminUser.findOne({ email: email.toLowerCase(), status: "active" });

    if (admin) {
      const { token, tokenHash } = createResetToken();
      admin.resetTokenHash = tokenHash;
      admin.resetTokenExpiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60_000);
      await admin.save();

      const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/reset-password?token=${token}`;
      // TODO: dispatch through the SMTP settings once the mailer service lands.
      console.info(`[auth] password reset link for ${admin.email}: ${resetUrl}`);
    }

    // Always the same response so the endpoint cannot confirm which emails exist.
    return ok({
      message: "If that email belongs to an admin account, a reset link has been sent.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
