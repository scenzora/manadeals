import { makeCreateHandler, makeListHandler } from "@/lib/crud";
import { categoryResource } from "@/lib/resources";

export const runtime = "nodejs";

export const GET = makeListHandler(categoryResource);
export const POST = makeCreateHandler(categoryResource);
