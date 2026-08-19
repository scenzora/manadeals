import { makeCreateHandler, makeListHandler } from "@/lib/crud";
import { brandResource } from "@/lib/resources";

export const runtime = "nodejs";

export const GET = makeListHandler(brandResource);
export const POST = makeCreateHandler(brandResource);
