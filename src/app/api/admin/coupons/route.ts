import type { NextRequest } from "next/server";

import { makeCreateHandler, makeListHandler } from "@/lib/crud";
import { couponResource } from "@/lib/resources";
import connectToDatabase from "@/lib/mongodb";
import { expireStaleOffers } from "@/services/expiry.service";

export const runtime = "nodejs";

const listHandler = makeListHandler(couponResource);

/** Expired offers are swept before the list is read, so status is always current. */
export async function GET(request: NextRequest, context: { params: Promise<Record<string, string>> }) {
  await connectToDatabase();
  await expireStaleOffers();
  return listHandler(request, context);
}

export const POST = makeCreateHandler(couponResource);
