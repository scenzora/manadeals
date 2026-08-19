import { makeCreateHandler, makeListHandler } from "@/lib/crud";
import { wikiResource } from "@/lib/resources";

export const runtime = "nodejs";

export const GET = makeListHandler(wikiResource);
export const POST = makeCreateHandler(wikiResource);
