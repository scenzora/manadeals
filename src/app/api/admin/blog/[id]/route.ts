import { makeDeleteHandler, makeGetHandler, makeUpdateHandler } from "@/lib/crud";
import { blogResource } from "@/lib/resources";

export const runtime = "nodejs";

export const GET = makeGetHandler(blogResource);
export const PUT = makeUpdateHandler(blogResource);
export const DELETE = makeDeleteHandler(blogResource);
