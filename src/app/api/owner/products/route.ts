import mongoose from "mongoose";

import { ApiException, ok, paginated, readJson } from "@/lib/api";
import { ownerRoute, tenantIdOf } from "@/lib/owner-api";
import { limitsFor } from "@/lib/plans";
import { parseListQuery, searchFilter } from "@/lib/utils/query";
import { refreshStore } from "@/lib/tenant/store.server";
import { ownProductSchema } from "@/lib/validations/store";
import { createOwnProduct } from "@/services/own-products.service";
import Category from "@/models/Category";
import Product from "@/models/Product";
import Tenant from "@/models/Tenant";

export const runtime = "nodejs";

const AVAILABILITY = ["in-stock", "out-of-stock", "limited", "pre-order"] as const;

/**
 * The store's own products, newest first. Server-side paging plus optional
 * filters: search (name/description), category, availability, visibility.
 */
export const GET = ownerRoute(async (request, { owner }) => {
  const params = request.nextUrl.searchParams;
  const { page, limit, search } = parseListQuery(params, { limit: 20 });

  const filter: Record<string, unknown> = { tenant: tenantIdOf(owner), ...searchFilter(search, ["name", "shortDescription"]) };

  const category = params.get("category") ?? "";
  if (mongoose.isValidObjectId(category)) filter.category = category;

  const availability = params.get("availability") ?? "";
  if ((AVAILABILITY as readonly string[]).includes(availability)) filter.availability = availability;

  const status = params.get("status") ?? "";
  if (status === "active" || status === "inactive") filter.status = status;
  if (status === "sample") filter.isSample = true;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .select("name thumbnail originalPrice salePrice status isSample category affiliateLinks availability shortDescription")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return paginated(
    products.map((product) => ({
      _id: String(product._id),
      name: product.name,
      shortDescription: product.shortDescription,
      image: product.thumbnail,
      category: String(product.category),
      originalPrice: product.originalPrice,
      salePrice: product.salePrice,
      availability: product.availability,
      status: product.status,
      isSample: product.isSample,
      affiliateUrl: product.affiliateLinks[0]?.affiliateUrl ?? "",
    })),
    total,
    page,
    limit,
  );
});

export const POST = ownerRoute(async (request, { owner }) => {
  const tenantId = tenantIdOf(owner);
  const tenant = await Tenant.findById(tenantId).select("slug plan");
  if (!tenant) throw new ApiException("Store not found", 404);

  const input = ownProductSchema.parse(await readJson(request));
  if (!(await Category.exists({ _id: input.category, status: "active" }))) throw new ApiException("Choose a category", 422);

  const allowed = limitsFor(tenant.plan).ownProducts;
  if ((await Product.countDocuments({ tenant: tenantId, isSample: false })) >= allowed) {
    throw new ApiException(`Your plan allows ${allowed} products. Upgrade to Pro to add more.`, 403);
  }

  const product = await createOwnProduct(tenantId, input);
  refreshStore(tenantId, tenant.slug);
  return ok({ id: String(product._id) }, 201);
});

/** Removes the dummy products a new store starts with. */
export const DELETE = ownerRoute(async (_request, { owner }) => {
  const tenantId = tenantIdOf(owner);
  const tenant = await Tenant.findById(tenantId).select("slug");
  const result = await Product.deleteMany({ tenant: tenantId, isSample: true });
  if (tenant) refreshStore(tenantId, tenant.slug);
  return ok({ removed: result.deletedCount });
});
