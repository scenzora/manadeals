import { adminRoute, ok, paginated, readJson } from "@/lib/api";
import Product from "@/models/Product";
import PriceHistory from "@/models/PriceHistory";
import { asFilter, parseListQuery, sanitize, searchFilter } from "@/lib/utils/query";
import { priceUpdateSchema } from "@/lib/validations/system";
import { recordPriceChange } from "@/services/product.service";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

/** Products with their tracked price markers and latest movement. */
export const GET = adminRoute("price-tracking.view", async (request) => {
  const searchParams = request.nextUrl.searchParams;
  const { page, limit, search, sort, order } = parseListQuery(searchParams, { sort: "updatedAt" });

  const category = searchParams.get("category");
  const filter = {
    ...sanitize(category ? { category } : {}),
    ...searchFilter(search, ["name", "slug", "sku"]),
  };

  const [products, total] = await Promise.all([
    Product.find(asFilter(filter))
      .select("name slug thumbnail originalPrice salePrice lowestPrice highestPrice currency updatedAt")
      .populate({ path: "category", select: "name" })
      .sort({ [sort]: order })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(asFilter(filter)),
  ]);

  const productIds = products.map((product) => product._id);
  const lastChanges = await PriceHistory.aggregate<{
    _id: unknown;
    priceChange: number;
    changePercentage: number;
    recordedAt: Date;
  }>([
    { $match: { product: { $in: productIds } } },
    { $sort: { recordedAt: -1 } },
    {
      $group: {
        _id: "$product",
        priceChange: { $first: "$priceChange" },
        changePercentage: { $first: "$changePercentage" },
        recordedAt: { $first: "$recordedAt" },
      },
    },
  ]);

  const changeMap = new Map(lastChanges.map((entry) => [String(entry._id), entry]));

  const items = products.map((product) => ({
    ...product,
    lastChange: changeMap.get(String(product._id)) ?? null,
  }));

  return paginated(items, total, page, limit);
});

/** Manual price update; the same path an automated updater will use later. */
export const POST = adminRoute("price-tracking.manage", async (request, { session }) => {
  const payload = priceUpdateSchema.parse(await readJson<unknown>(request));

  const result = await recordPriceChange({
    productId: payload.product,
    currentPrice: payload.currentPrice,
    affiliateNetwork: payload.affiliateNetwork,
    source: payload.source,
  });

  if (!result) return ok({ updated: false });

  await logActivity({
    session,
    action: "update",
    module: "price-tracking",
    recordId: payload.product,
    description: `Price of "${result.product.name}" set to ${payload.currentPrice}`,
    request,
    before: { salePrice: result.entry.previousPrice },
    after: { salePrice: payload.currentPrice },
  });

  return ok({ updated: true, entry: result.entry.toObject() });
});
