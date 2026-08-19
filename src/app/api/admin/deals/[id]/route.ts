import { makeDeleteHandler, makeGetHandler, makeUpdateHandler } from "@/lib/crud";
import { dealResource } from "@/lib/resources";

export const runtime = "nodejs";

export const GET = makeGetHandler(dealResource);
export const PUT = makeUpdateHandler(dealResource);
export const DELETE = makeDeleteHandler(dealResource);
