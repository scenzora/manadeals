import "server-only";

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

import connectToDatabase from "@/lib/mongodb";
import StoreOwner from "@/models/StoreOwner";
import { AuthError } from "@/lib/auth";

const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) throw new Error("AUTH_SECRET is not defined. Add it to your .env.local file.");

export const OWNER_COOKIE = process.env.OWNER_COOKIE_NAME || "manadeals_owner_session";
const OWNER_SESSION_DAYS = 14;
const ISSUER = "manadeals-owner";

export type OwnerSession = { id: string; name: string; email: string; tenantId: string | null };

export function signOwnerToken(payload: { sub: string; tokenVersion: number }) {
  return jwt.sign(payload, AUTH_SECRET!, { expiresIn: `${OWNER_SESSION_DAYS}d`, issuer: ISSUER });
}

export async function setOwnerCookie(token: string) {
  (await cookies()).set(OWNER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OWNER_SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearOwnerCookie() {
  (await cookies()).set(OWNER_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** The signed-in store owner, or null (missing, expired, revoked or blocked). */
export async function getOwnerSession(): Promise<OwnerSession | null> {
  const token = (await cookies()).get(OWNER_COOKIE)?.value;
  if (!token) return null;

  let payload: { sub?: string; tokenVersion?: number };
  try {
    payload = jwt.verify(token, AUTH_SECRET!, { issuer: ISSUER }) as typeof payload;
  } catch {
    return null;
  }
  if (!payload.sub) return null;

  await connectToDatabase();
  const owner = await StoreOwner.findById(payload.sub).lean();
  if (!owner || owner.status !== "active" || (owner.tokenVersion ?? 0) !== payload.tokenVersion) return null;

  return {
    id: String(owner._id),
    name: owner.name,
    email: owner.email,
    tenantId: owner.tenant ? String(owner.tenant) : null,
  };
}

export async function requireOwner(): Promise<OwnerSession> {
  const session = await getOwnerSession();
  if (!session) throw new AuthError("Authentication required", 401);
  return session;
}
