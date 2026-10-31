import { z } from "zod";

import { ApiException, ok, readJson } from "@/lib/api";
import { ownerRoute, tenantIdOf } from "@/lib/owner-api";
import { limitsFor } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_IMPORT_ROWS, normaliseRow, parseAvailability, parsePrice, parseStatus } from "@/lib/product-csv";
import { refreshStore } from "@/lib/tenant/store.server";
import { ownProductSchema } from "@/lib/validations/store";
import { createOwnProduct } from "@/services/own-products.service";
import Category from "@/models/Category";
import Product from "@/models/Product";
import Tenant from "@/models/Tenant";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  rows: z.array(z.record(z.string(), z.string())).min(1, "The file has no rows").max(MAX_IMPORT_ROWS, `Import up to ${MAX_IMPORT_ROWS} products at a time`),
});

/** Creates products from parsed CSV rows. Bad rows are reported, good rows still import. */
export const POST = ownerRoute(async (request, { owner }) => {
  const tenantId = tenantIdOf(owner);
  const limit = rateLimit(`product-import:${owner.id}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) throw new ApiException("Too many imports. Try again later.", 429);

  const tenant = await Tenant.findById(tenantId).select("slug plan");
  if (!tenant) throw new ApiException("Store not found", 404);
  const { rows } = bodySchema.parse(await readJson(request));

  const categories = await Category.find({ status: "active" }).select("name").sort({ order: 1 }).lean();
  if (categories.length === 0) throw new ApiException("No categories exist yet, so products cannot be filed", 409);
  const byName = new Map(categories.map((category) => [category.name.trim().toLowerCase(), String(category._id)]));

  const allowed = limitsFor(tenant.plan).ownProducts;
  let room = allowed - (await Product.countDocuments({ tenant: tenantId, isSample: false }));

  const failed: { row: number; error: string }[] = [];
  let created = 0;

  for (const [index, raw] of rows.entries()) {
    const rowNumber = index + 2; // header is row 1
    if (room <= 0) {
      failed.push({ row: rowNumber, error: `Plan limit of ${allowed} products reached` });
      continue;
    }

    const row = normaliseRow(raw);
    const category = byName.get((row.category ?? "").toLowerCase()) ?? String(categories[0]!._id);
    const parsed = ownProductSchema.safeParse({
      name: row.name,
      shortDescription: row.short_description ?? "",
      category,
      originalPrice: parsePrice(row.original_price ?? row.sale_price),
      salePrice: parsePrice(row.sale_price),
      image: row.image_url ?? "",
      affiliateUrl: row.affiliate_url,
      availability: parseAvailability(row.availability),
      status: parseStatus(row.status),
    });

    if (!parsed.success) {
      failed.push({ row: rowNumber, error: parsed.error.issues[0]?.message ?? "Invalid row" });
      continue;
    }

    await createOwnProduct(tenantId, parsed.data);
    created += 1;
    room -= 1;
  }

  if (created > 0) refreshStore(tenantId, tenant.slug);
  return ok({ created, failed: failed.slice(0, 50), failedCount: failed.length });
});
