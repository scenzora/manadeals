import type { NextRequest } from "next/server";

import connectToDatabase from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import Role from "@/models/Role";
import { loginSchema } from "@/lib/validations/auth";
import {
  LOCKOUT_MINUTES,
  MAX_LOGIN_ATTEMPTS,
  setSessionCookie,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { clientIp, fail, handleRouteError, ok, readJson } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

/** Deliberately vague so the endpoint cannot be used to enumerate accounts. */
const INVALID_CREDENTIALS = "Invalid email or password";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const limited = rateLimit(`login:${ip}`, 10, 5 * 60 * 1000);
    if (!limited.allowed) {
      return fail(
        `Too many sign-in attempts. Try again in ${limited.retryAfterSeconds} seconds.`,
        429,
      );
    }

    const body = await readJson<unknown>(request);
    const { email, password, remember } = loginSchema.parse(body);

    await connectToDatabase();
    const admin = await AdminUser.findOne({ email: email.toLowerCase() })
      .select("+passwordHash")
      .populate({ path: "role", model: Role });

    if (!admin) {
      await logActivity({
        session: null,
        action: "login-failed",
        module: "auth",
        description: `Failed sign-in for unknown email ${email}`,
        request,
      });
      return fail(INVALID_CREDENTIALS, 401);
    }

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const minutes = Math.ceil((admin.lockedUntil.getTime() - Date.now()) / 60000);
      return fail(`Account temporarily locked. Try again in ${minutes} minute(s).`, 423);
    }

    const passwordMatches = await verifyPassword(password, admin.passwordHash);

    if (!passwordMatches) {
      admin.failedLoginAttempts = (admin.failedLoginAttempts ?? 0) + 1;
      if (admin.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        admin.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000);
        admin.failedLoginAttempts = 0;
      }
      await admin.save();

      await logActivity({
        session: { id: String(admin._id), name: admin.name, email: admin.email },
        action: "login-failed",
        module: "auth",
        description: "Incorrect password",
        request,
      });
      return fail(INVALID_CREDENTIALS, 401);
    }

    if (admin.status !== "active") {
      return fail("This account has been deactivated. Contact a super admin.", 403);
    }

    admin.failedLoginAttempts = 0;
    admin.lockedUntil = null;
    admin.lastLoginAt = new Date();
    admin.lastLoginIp = ip;
    await admin.save();

    const token = signSessionToken(
      { sub: String(admin._id), tokenVersion: admin.tokenVersion ?? 0 },
      remember,
    );
    await setSessionCookie(token, remember);

    await logActivity({
      session: { id: String(admin._id), name: admin.name, email: admin.email },
      action: "login",
      module: "auth",
      description: "Signed in to the admin panel",
      request,
    });

    const role = admin.role as unknown as { name?: string; slug?: string } | null;

    return ok({
      id: String(admin._id),
      name: admin.name,
      email: admin.email,
      roleName: role?.name ?? "",
      roleSlug: role?.slug ?? "",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
