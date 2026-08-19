import { makeOptionsHandler } from "@/lib/crud";
import Category from "@/models/Category";

export const runtime = "nodejs";

export const GET = makeOptionsHandler({
  model: Category,
  module: "categories",
  filter: { status: "active" },
});
