import { adminRoute, ok, paginated, readJson } from "@/lib/api";
import { asFilter, parseListQuery, sanitize, searchFilter } from "@/lib/utils/query";
import Product from "@/models/Product";
import { productSchema } from "@/lib/validations/catalogue";
import { logActivity } from "@/services/activity-log.service";
import { uniqueSlug } from "@/services/product.service";

export const runtime = "nodejs";

const FILTERS = ["status", "category", "subcategory", "brand", "availability"] as const;
const BOOLEAN_FILTERS = ["isFeatured", "isTrending", "isDealOfTheDay"] as const;

export const GET = adminRoute("products.view", async (request) => {
  const searchParams = request.nextUrl.searchParams;
  const { page, limit, search, sort, order } = parseListQuery(searchParams);

  const filter: Record<string, unknown> = {};
  for (const field of FILTERS) {
    const value = searchParams.get(field);
    if (value) filter[field] = value;
  }
  for (const field of BOOLEAN_FILTERS) {
    const value = searchParams.get(field);
    if (value === "true" || value === "false") filter[field] = value === "true";
  }

  const network = searchParams.get("affiliateNetwork");
  if (network) filter["affiliateLinks.network"] = network;

  const minPrice = Number(searchParams.get("minPrice"));
  const maxPrice = Number(searchParams.get("maxPrice"));
  if (Number.isFinite(minPrice) && minPrice > 0) {
    filter.salePrice = { ...(filter.salePrice as object), $gte: minPrice };
  }
  if (Number.isFinite(maxPrice) && maxPrice > 0) {
    filter.salePrice = { ...(filter.salePrice as object), $lte: maxPrice };
  }

  const query = { ...sanitize(filter), ...searchFilter(search, ["name", "slug", "sku"]) };

  const [items, total] = await Promise.all([
    Product.find(asFilter(query))
      .select("-description")
      .populate({ path: "category", select: "name slug" })
      .populate({ path: "brand", select: "name slug" })
      .populate({ path: "affiliateLinks.network", select: "name code" })
      .sort({ [sort]: order })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(asFilter(query)),
  ]);

  return paginated(items, total, page, limit);
});

export const POST = adminRoute("products.create", async (request, { session }) => {
  const payload = productSchema.parse(await readJson<unknown>(request));

  const product = await Product.create({
    ...payload,
    slug: await uniqueSlug(payload.slug || payload.name),
    createdBy: session.id,
    updatedBy: session.id,
  });

  await logActivity({
    session,
    action: "create",
    module: "products",
    recordId: String(product._id),
    description: `Created product "${product.name}"`,
    request,
    after: product.toObject(),
  });

  return ok(product.toObject(), 201);
});
