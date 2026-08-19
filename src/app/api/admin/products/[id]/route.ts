import { adminRoute, assertObjectId, fail, ok, readJson } from "@/lib/api";
import Product from "@/models/Product";
import PriceHistory from "@/models/PriceHistory";
import { productSchema } from "@/lib/validations/catalogue";
import { logActivity } from "@/services/activity-log.service";
import { recordPriceChange, uniqueSlug } from "@/services/product.service";

export const runtime = "nodejs";

export const GET = adminRoute<{ id: string }>("products.view", async (_request, { params }) => {
  const { id } = await params;
  assertObjectId(id);

  const product = await Product.findById(id)
    .populate({ path: "category", select: "name slug" })
    .populate({ path: "subcategory", select: "name slug" })
    .populate({ path: "brand", select: "name slug" })
    .populate({ path: "affiliateLinks.network", select: "name code" })
    .lean();

  if (!product) return fail("Product not found", 404);
  return ok(product);
});

export const PUT = adminRoute<{ id: string }>("products.edit", async (request, { params, session }) => {
  const { id } = await params;
  assertObjectId(id);

  const payload = productSchema.parse(await readJson<unknown>(request));
  const before = await Product.findById(id);
  if (!before) return fail("Product not found", 404);

  const priceChanged = before.salePrice !== payload.salePrice;
  const previousPrice = before.salePrice;

  Object.assign(before, payload, {
    slug: await uniqueSlug(payload.slug || payload.name, id),
    updatedBy: session.id,
  });
  await before.save(); // triggers the discount/lowest/highest hook

  // Keep the price history in step with manual edits so charts stay accurate.
  if (priceChanged) {
    await PriceHistory.create({
      product: before._id,
      previousPrice,
      currentPrice: payload.salePrice,
      priceChange: payload.salePrice - previousPrice,
      changePercentage: previousPrice
        ? Number((((payload.salePrice - previousPrice) / previousPrice) * 100).toFixed(2))
        : 0,
      currency: before.currency,
      source: "manual",
    });
  }

  await logActivity({
    session,
    action: "update",
    module: "products",
    recordId: id,
    description: `Updated product "${before.name}"`,
    request,
    before: { salePrice: previousPrice },
    after: before.toObject(),
  });

  return ok(before.toObject());
});

export const PATCH = adminRoute<{ id: string }>("products.edit", async (request, { params, session }) => {
  const { id } = await params;
  assertObjectId(id);

  const body = await readJson<{ salePrice?: number; source?: "manual" | "api" | "scraper" }>(request);
  if (typeof body.salePrice !== "number" || body.salePrice < 0) {
    return fail("A valid salePrice is required", 422);
  }

  const result = await recordPriceChange({
    productId: id,
    currentPrice: body.salePrice,
    source: body.source ?? "manual",
  });
  if (!result) return fail("Product not found", 404);

  await logActivity({
    session,
    action: "update",
    module: "price-tracking",
    recordId: id,
    description: `Updated price of "${result.product.name}"`,
    request,
    before: { salePrice: result.entry.previousPrice },
    after: { salePrice: body.salePrice },
  });

  return ok({ product: result.product.toObject(), entry: result.entry.toObject() });
});

export const DELETE = adminRoute<{ id: string }>(
  "products.delete",
  async (request, { params, session }) => {
    const { id } = await params;
    assertObjectId(id);

    const product = await Product.findByIdAndDelete(id).lean();
    if (!product) return fail("Product not found", 404);

    await PriceHistory.deleteMany({ product: id });

    await logActivity({
      session,
      action: "delete",
      module: "products",
      recordId: id,
      description: `Deleted product "${product.name}"`,
      request,
      before: product,
    });

    return ok({ deleted: true });
  },
);
