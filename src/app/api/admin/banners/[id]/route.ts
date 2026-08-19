import { makeDeleteHandler, makeGetHandler, makeUpdateHandler } from "@/lib/crud";
import { bannerResource } from "@/lib/resources";

export const runtime = "nodejs";

export const GET = makeGetHandler(bannerResource);
export const PUT = makeUpdateHandler(bannerResource);
export const DELETE = makeDeleteHandler(bannerResource);
