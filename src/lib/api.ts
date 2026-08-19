import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import mongoose from "mongoose";

import connectToDatabase from "@/lib/mongodb";
import { AuthError, requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import type { AdminSession, Paginated } from "@/types";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(error: string, status = 400, details?: Record<string, string[]>) {
  return NextResponse.json({ success: false, error, ...(details ? { details } : {}) }, { status });
}

export function paginated<T>(items: T[], total: number, page: number, limit: number) {
  const body: Paginated<T> = {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
  return ok(body);
}

export class ApiException extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** Next.js route context: dynamic segments arrive as a promise. */
export type RouteContext<P extends Record<string, string> = Record<string, string>> = {
  params: Promise<P>;
};

type Handler<P extends Record<string, string>> = (
  request: NextRequest,
  context: RouteContext<P> & { session: AdminSession },
) => Promise<NextResponse> | NextResponse;

/**
 * Wraps an admin route handler with: DB connection, session check, permission
 * check and uniform error translation. Every /api/admin route uses this so no
 * endpoint can accidentally ship without authorization.
 */
export function adminRoute<P extends Record<string, string> = Record<string, string>>(
  permission: string | string[] | null,
  handler: Handler<P>,
) {
  return async (request: NextRequest, context: RouteContext<P>) => {
    try {
      await connectToDatabase();
      const session = await requireSession();

      if (permission) {
        const required = Array.isArray(permission) ? permission : [permission];
        const granted = required.some((entry) => hasPermission(session, entry));
        if (!granted) return fail("You do not have permission to perform this action", 403);
      }

      return await handler(request, { ...context, session });
    } catch (error) {
      return handleRouteError(error);
    }
  };
}

export function handleRouteError(error: unknown) {
  if (error instanceof AuthError) return fail(error.message, error.status);
  if (error instanceof ApiException) return fail(error.message, error.status);

  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join(".") || "_";
      (details[path] ??= []).push(issue.message);
    }
    return fail("Validation failed", 422, details);
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const details: Record<string, string[]> = {};
    for (const [field, issue] of Object.entries(error.errors)) {
      details[field] = [issue.message];
    }
    return fail("Validation failed", 422, details);
  }

  if (error instanceof mongoose.Error.CastError) {
    return fail("Invalid identifier", 400);
  }

  if (typeof error === "object" && error !== null && (error as { code?: number }).code === 11000) {
    const key = Object.keys((error as { keyValue?: Record<string, unknown> }).keyValue ?? {})[0];
    return fail(key ? `A record with this ${key} already exists` : "Duplicate record", 409);
  }

  console.error("[api] unhandled error", error);
  return fail("Something went wrong. Please try again.", 500);
}

export function assertObjectId(id: string, label = "id") {
  if (!mongoose.isValidObjectId(id)) throw new ApiException(`Invalid ${label}`, 400);
  return id;
}

export async function readJson<T>(request: NextRequest): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiException("Request body must be valid JSON", 400);
  }
}

export function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
