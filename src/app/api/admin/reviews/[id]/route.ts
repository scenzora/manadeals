import { makeDeleteHandler, makeGetHandler, makeUpdateHandler } from "@/lib/crud";
import { reviewResource } from "@/lib/resources";

export const runtime = "nodejs";

export const GET = makeGetHandler(reviewResource);
export const PUT = makeUpdateHandler(reviewResource);
export const DELETE = makeDeleteHandler(reviewResource);
