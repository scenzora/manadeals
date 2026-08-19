import { makeCreateHandler, makeListHandler } from "@/lib/crud";
import { affiliateNetworkResource } from "@/lib/resources";

export const runtime = "nodejs";

export const GET = makeListHandler(affiliateNetworkResource);
export const POST = makeCreateHandler(affiliateNetworkResource);
