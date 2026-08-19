import { makeOptionsHandler } from "@/lib/crud";
import AffiliateNetwork from "@/models/AffiliateNetwork";

export const runtime = "nodejs";

export const GET = makeOptionsHandler({
  model: AffiliateNetwork,
  module: "affiliate-networks",
  filter: { status: "active" },
});
