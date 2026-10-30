import { NextResponse, type NextRequest } from "next/server";

import connectToDatabase from "@/lib/mongodb";
import { clientIp, fail, handleRouteError, ok, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { setOwnerCookie, signOwnerToken } from "@/lib/owner-auth";
import StoreOwner from "@/models/StoreOwner";
import { signupSchema } from "@/lib/validations/store";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Signups are the abuse magnet for a free tier: 5 per hour per address.
    const limit = rateLimit(`owner-signup:${clientIp(request)}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail(`Too many signups from this address. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`, 429);
    }

    const input = signupSchema.parse(await readJson(request));
    await connectToDatabase();

    if (await StoreOwner.exists({ email: input.email })) {
      return fail("An account with this email already exists", 409);
    }

    const owner = await StoreOwner.create({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    });

    await setOwnerCookie(signOwnerToken({ sub: String(owner._id), tokenVersion: owner.tokenVersion }));
    return ok({ id: String(owner._id) }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
