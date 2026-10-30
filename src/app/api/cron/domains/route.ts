import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { recheckDueDomains } from "@/services/domain.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed: the job is off until a secret is configured
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/** Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: NextRequest) {
  if (!authorised(request)) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await recheckDueDomains());
}
