import { ApiException, assertObjectId, ok, readJson } from "@/lib/api";
import { ownerRoute, tenantIdOf } from "@/lib/owner-api";
import { refreshStore } from "@/lib/tenant/store.server";
import { ownProductSchema } from "@/lib/validations/store";
import { buildOwnProductFields } from "@/services/own-products.service";
import Category from "@/models/Category";
import Product from "@/models/Product";
import Tenant from "@/models/Tenant";

export const runtime = "nodejs";

export const PUT = ownerRoute<{ id: string }>(async (request, { owner, params }) => {
  const tenantId = tenantIdOf(owner);
  const id = assertObjectId((await params).id);
  const input = ownProductSchema.parse(await readJson(request));
  if (!(await Category.exists({ _id: input.category, status: "active" }))) throw new ApiException("Choose a category", 422);

  // The tenant comes from the session: an owner can only ever touch their own products.
  const product = await Product.findOne({ _id: id, tenant: tenantId });
  if (!product) throw new ApiException("Product not found", 404);

  product.set({ ...(await buildOwnProductFields(input)), isSample: false });
  await product.save();

  const tenant = await Tenant.findById(tenantId).select("slug");
  if (tenant) refreshStore(tenantId, tenant.slug);
  return ok({ id });
});

export const DELETE = ownerRoute<{ id: string }>(async (_request, { owner, params }) => {
  const tenantId = tenantIdOf(owner);
  const id = assertObjectId((await params).id);
  const result = await Product.deleteOne({ _id: id, tenant: tenantId });
  if (result.deletedCount === 0) throw new ApiException("Product not found", 404);

  const tenant = await Tenant.findById(tenantId).select("slug");
  if (tenant) refreshStore(tenantId, tenant.slug);
  return ok({ deleted: true });
});
