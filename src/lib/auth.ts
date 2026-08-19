import "server-only";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

import connectToDatabase from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import Role from "@/models/Role";
import { ROLE_SLUGS } from "@/lib/permissions";
import type { AdminSession } from "@/types";

const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  throw new Error("AUTH_SECRET is not defined. Add it to your .env.local file.");
}

export const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || "manadeals_admin_session";
const SESSION_HOURS = Number(process.env.AUTH_SESSION_HOURS) || 8;
const REMEMBER_DAYS = Number(process.env.AUTH_REMEMBER_DAYS) || 30;

const BCRYPT_ROUNDS = 12;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

type TokenPayload = {
  sub: string;
  tokenVersion: number;
};

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signSessionToken(payload: TokenPayload, remember: boolean) {
  return jwt.sign(payload, AUTH_SECRET!, {
    expiresIn: remember ? `${REMEMBER_DAYS}d` : `${SESSION_HOURS}h`,
    issuer: "manadeals-admin",
  });
}

function verifySessionToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, AUTH_SECRET!, { issuer: "manadeals-admin" }) as TokenPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string, remember: boolean) {
  const store = await cookies();
  store.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: remember ? REMEMBER_DAYS * 24 * 60 * 60 : SESSION_HOURS * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(AUTH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/**
 * Resolves the current admin from the session cookie. Returns null for missing,
 * expired, revoked (tokenVersion bump) or deactivated accounts.
 */
export async function getSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload?.sub) return null;

  await connectToDatabase();
  const admin = await AdminUser.findById(payload.sub).populate({ path: "role", model: Role }).lean();
  if (!admin || admin.status !== "active") return null;
  if ((admin.tokenVersion ?? 0) !== payload.tokenVersion) return null;

  const role = admin.role as unknown as {
    _id: unknown;
    name?: string;
    slug?: string;
    permissions?: string[];
  } | null;

  return {
    id: String(admin._id),
    name: admin.name,
    email: admin.email,
    avatar: admin.avatar ?? "",
    roleId: role ? String(role._id) : "",
    roleName: role?.name ?? "",
    roleSlug: role?.slug ?? "",
    isSuperAdmin: role?.slug === ROLE_SLUGS.SUPER_ADMIN,
    permissions: role?.permissions ?? [],
  };
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Throws instead of returning null — for use inside API route handlers. */
export async function requireSession(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) throw new AuthError("Authentication required", 401);
  return session;
}
