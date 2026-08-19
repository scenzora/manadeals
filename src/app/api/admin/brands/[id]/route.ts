import { makeDeleteHandler, makeGetHandler, makeUpdateHandler } from "@/lib/crud";
import { brandResource } from "@/lib/resources";

export const runtime = "nodejs";

export const GET = makeGetHandler(brandResource);
export const PUT = makeUpdateHandler(brandResource);
export const DELETE = makeDeleteHandler(brandResource);
