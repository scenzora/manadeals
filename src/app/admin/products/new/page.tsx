import type { Metadata } from "next";

import connectToDatabase from "@/lib/mongodb";
import Product from "@/models/Product";
import { guardPage } from "@/lib/page-guard";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Add product" };
export const dynamic = "force-dynamic";

/** Supports `?duplicate=<id>` to prefill the form from an existing product. */
export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string }>;
}) {
  const { denied } = await guardPage(["products.create"]);
  if (denied) return denied;

  const { duplicate } = await searchParams;
  let initialValues;

  if (duplicate) {
    await connectToDatabase();
    const source = await Product.findById(duplicate).lean();
    if (source) {
      initialValues = {
        ...JSON.parse(JSON.stringify(source)),
        _id: undefined,
        name: `${source.name} (copy)`,
        slug: "",
        status: "draft" as const,
        category: String(source.category),
        subcategory: source.subcategory ? String(source.subcategory) : null,
        brand: source.brand ? String(source.brand) : null,
        affiliateLinks: source.affiliateLinks.map((link) => ({
          ...JSON.parse(JSON.stringify(link)),
          network: String(link.network),
        })),
      };
    }
  }

  return <ProductForm initialValues={initialValues} />;
}
