import { makeDeleteHandler, makeGetHandler, makeUpdateHandler } from "@/lib/crud";
import { affiliateNetworkResource } from "@/lib/resources";

export const runtime = "nodejs";

export const GET = makeGetHandler(affiliateNetworkResource);
export const PUT = makeUpdateHandler(affiliateNetworkResource);
export const DELETE = makeDeleteHandler(affiliateNetworkResource);
