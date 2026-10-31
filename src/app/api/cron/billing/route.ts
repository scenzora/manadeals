import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import connectToDatabase from "@/lib/mongodb";
import { expireLapsedPlans } from "@/services/billing.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/** Daily: downgrade stores whose Pro term plus grace period has ended. */
export async function GET(request: NextRequest) {
  if (!authorised(request)) return new NextResponse("Unauthorized", { status: 401 });
  await connectToDatabase();
  return NextResponse.json(await expireLapsedPlans());
}
