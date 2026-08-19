import { makeCreateHandler, makeListHandler } from "@/lib/crud";
import { bannerResource } from "@/lib/resources";

export const runtime = "nodejs";

export const GET = makeListHandler(bannerResource);
export const POST = makeCreateHandler(bannerResource);
