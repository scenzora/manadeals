import { NextResponse, type NextRequest } from "next/server";

import connectToDatabase from "@/lib/mongodb";
import { clientIp, fail, handleRouteError, ok, readJson } from "@/lib/api";
import { verifyPassword, LOCKOUT_MINUTES, MAX_LOGIN_ATTEMPTS } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { setOwnerCookie, signOwnerToken } from "@/lib/owner-auth";
import StoreOwner from "@/models/StoreOwner";
import { ownerLoginSchema } from "@/lib/validations/store";

export const runtime = "nodejs";

const INVALID = "Incorrect email or password";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const limit = rateLimit(`owner-login:${clientIp(request)}`, 20, 15 * 60 * 1000);
    if (!limit.allowed) return fail("Too many attempts. Please wait and try again.", 429);

    const input = ownerLoginSchema.parse(await readJson(request));
    await connectToDatabase();

    const owner = await StoreOwner.findOne({ email: input.email }).select("+passwordHash");
    if (!owner || owner.status !== "active") return fail(INVALID, 401);

    if (owner.lockedUntil && owner.lockedUntil > new Date()) {
      return fail(`Account locked. Try again in ${LOCKOUT_MINUTES} minutes.`, 423);
    }

    if (!(await verifyPassword(input.password, owner.passwordHash))) {
      owner.failedLogins += 1;
      if (owner.failedLogins >= MAX_LOGIN_ATTEMPTS) {
        owner.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000);
        owner.failedLogins = 0;
      }
      await owner.save();
      return fail(INVALID, 401);
    }

    owner.failedLogins = 0;
    owner.lockedUntil = null;
    owner.lastLoginAt = new Date();
    await owner.save();

    await setOwnerCookie(signOwnerToken({ sub: String(owner._id), tokenVersion: owner.tokenVersion }));
    return ok({ hasStore: Boolean(owner.tenant) });
  } catch (error) {
    return handleRouteError(error);
  }
}
