import { ok } from "@/lib/api";
import { ownerRoute } from "@/lib/owner-api";
import { escapeRegex } from "@/lib/utils/slug";
import Category from "@/models/Category";
import Product from "@/models/Product";

export const runtime = "nodejs";

/** Picker data for the catalogue page: categories, or a product search for deal of the day. */
export const GET = ownerRoute(async (request, { owner }) => {
  const type = request.nextUrl.searchParams.get("type");

  if (type === "products") {
    const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
    const products = await Product.find({
      status: "active",
      tenant: { $in: [null, owner.tenantId] },
      ...(q ? { name: new RegExp(escapeRegex(q), "i") } : {}),
    })
      .select("name thumbnail salePrice discountPercentage")
      .sort({ discountPercentage: -1 })
      .limit(10)
      .lean();
    return ok(JSON.parse(JSON.stringify(products)));
  }

  const categories = await Category.find({ status: "active" }).select("name parent").sort({ order: 1 }).lean();
  return ok(JSON.parse(JSON.stringify(categories)));
});
