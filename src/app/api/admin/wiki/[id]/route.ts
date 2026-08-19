import { makeDeleteHandler, makeGetHandler, makeUpdateHandler } from "@/lib/crud";
import { wikiResource } from "@/lib/resources";

export const runtime = "nodejs";

export const GET = makeGetHandler(wikiResource);
export const PUT = makeUpdateHandler(wikiResource);
export const DELETE = makeDeleteHandler(wikiResource);
