import { makeCreateHandler, makeListHandler } from "@/lib/crud";
import { blogResource } from "@/lib/resources";

export const runtime = "nodejs";

export const GET = makeListHandler(blogResource);
export const POST = makeCreateHandler(blogResource);
