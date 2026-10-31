import { NextResponse } from "next/server";

import { ownerRoute, tenantIdOf } from "@/lib/owner-api";
import { toCsv } from "@/lib/utils/csv";
import { PRODUCT_CSV_HEADERS } from "@/lib/product-csv";
import Category from "@/models/Category";
import Product from "@/models/Product";

export const runtime = "nodejs";

/** All of the store's own products as a CSV that the import accepts back unchanged. */
export const GET = ownerRoute(async (_request, { owner }) => {
  const [products, categories] = await Promise.all([
    Product.find({ tenant: tenantIdOf(owner) }).sort({ createdAt: 1 }).lean(),
    Category.find({}).select("name").lean(),
  ]);
  const categoryNames = new Map(categories.map((category) => [String(category._id), category.name]));

  const csv = toCsv(
    PRODUCT_CSV_HEADERS,
    products.map((product) => [
      product.name,
      product.shortDescription ?? "",
      categoryNames.get(String(product.category)) ?? "",
      product.originalPrice,
      product.salePrice,
      product.thumbnail ?? "",
      product.affiliateLinks[0]?.affiliateUrl ?? "",
      product.availability,
      product.status,
    ]),
  );

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="my-products.csv"',
      "Cache-Control": "no-store",
    },
  });
});
