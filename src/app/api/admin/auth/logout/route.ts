import type { NextRequest } from "next/server";

import { clearSessionCookie, getSession } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api";
import connectToDatabase from "@/lib/mongodb";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getSession();
    await clearSessionCookie();

    if (session) {
      await logActivity({
        session,
        action: "logout",
        module: "auth",
        description: "Signed out",
        request,
      });
    }

    return ok({ signedOut: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
