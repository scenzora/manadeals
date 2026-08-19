import { makeDeleteHandler, makeGetHandler, makeUpdateHandler } from "@/lib/crud";
import { couponResource } from "@/lib/resources";

export const runtime = "nodejs";

export const GET = makeGetHandler(couponResource);
export const PUT = makeUpdateHandler(couponResource);
export const DELETE = makeDeleteHandler(couponResource);
