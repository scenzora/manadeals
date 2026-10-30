import "server-only";

import type { NextRequest, NextResponse } from "next/server";

import connectToDatabase from "@/lib/mongodb";
import { ApiException, handleRouteError, type RouteContext } from "@/lib/api";
import { requireOwner, type OwnerSession } from "@/lib/owner-auth";

type Handler<P extends Record<string, string>> = (
  request: NextRequest,
  context: RouteContext<P> & { owner: OwnerSession },
) => Promise<NextResponse> | NextResponse;

/** Owner counterpart of `adminRoute`: DB connection, session check, uniform errors. */
export function ownerRoute<P extends Record<string, string> = Record<string, string>>(handler: Handler<P>) {
  return async (request: NextRequest, context: RouteContext<P>) => {
    try {
      await connectToDatabase();
      const owner = await requireOwner();
      return await handler(request, { ...context, owner });
    } catch (error) {
      return handleRouteError(error);
    }
  };
}

/** The owner's store id. Every tenant-scoped query starts from this, never from the request. */
export function tenantIdOf(owner: OwnerSession) {
  if (!owner.tenantId) throw new ApiException("Create your store first", 409);
  return owner.tenantId;
}
