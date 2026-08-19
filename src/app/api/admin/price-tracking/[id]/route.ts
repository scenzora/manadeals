import { adminRoute, assertObjectId, fail, ok } from "@/lib/api";
import Product from "@/models/Product";
import PriceHistory from "@/models/PriceHistory";

export const runtime = "nodejs";

/** Full price history for one product, oldest first (chart-friendly). */
export const GET = adminRoute<{ id: string }>("price-tracking.view", async (_request, { params }) => {
  const { id } = await params;
  assertObjectId(id);

  const [product, history] = await Promise.all([
    Product.findById(id)
      .select("name slug thumbnail originalPrice salePrice lowestPrice highestPrice currency")
      .lean(),
    PriceHistory.find({ product: id }).sort({ recordedAt: 1 }).limit(365).lean(),
  ]);

  if (!product) return fail("Product not found", 404);

  return ok({ product, history });
});
