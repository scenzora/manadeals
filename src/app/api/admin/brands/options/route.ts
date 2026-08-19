import { makeOptionsHandler } from "@/lib/crud";
import Brand from "@/models/Brand";

export const runtime = "nodejs";

export const GET = makeOptionsHandler({
  model: Brand,
  module: "brands",
  filter: { status: "active" },
});
