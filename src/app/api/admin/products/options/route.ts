import { adminRoute, ok } from "@/lib/api";
import Product from "@/models/Product";
import { escapeRegex } from "@/lib/utils/slug";

export const runtime = "nodejs";

/** Search-as-you-type options for product pickers (deals, price tracking). */
export const GET = adminRoute("products.view", async (request) => {
  const search = (request.nextUrl.searchParams.get("search") ?? "").trim().slice(0, 80);
  const filter = search ? { name: new RegExp(escapeRegex(search), "i") } : {};

  const products = await Product.find(filter).select("name").sort({ name: 1 }).limit(100).lean();

  return ok(products.map((product) => ({ value: String(product._id), label: product.name })));
});
