import { makeDeleteHandler, makeGetHandler, makeUpdateHandler } from "@/lib/crud";
import { categoryResource } from "@/lib/resources";

export const runtime = "nodejs";

export const GET = makeGetHandler(categoryResource);
export const PUT = makeUpdateHandler(categoryResource);
export const DELETE = makeDeleteHandler(categoryResource);
