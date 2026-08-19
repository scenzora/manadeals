import { makeCreateHandler, makeListHandler } from "@/lib/crud";
import { reviewResource } from "@/lib/resources";

export const runtime = "nodejs";

export const GET = makeListHandler(reviewResource);
export const POST = makeCreateHandler(reviewResource);
