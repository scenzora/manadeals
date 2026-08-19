import type { Metadata } from "next";
import { notFound } from "next/navigation";
import mongoose from "mongoose";

import connectToDatabase from "@/lib/mongodb";
import Product from "@/models/Product";
import { guardPage } from "@/lib/page-guard";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Edit product" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { denied } = await guardPage(["products.edit", "products.view"]);
  if (denied) return denied;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();

  await connectToDatabase();
  const product = await Product.findById(id).lean();
  if (!product) notFound();

  // Server documents are serialised before crossing into the client form.
  const initialValues = {
    ...JSON.parse(JSON.stringify(product)),
    category: String(product.category),
    subcategory: product.subcategory ? String(product.subcategory) : null,
    brand: product.brand ? String(product.brand) : null,
    affiliateLinks: product.affiliateLinks.map((link) => ({
      ...JSON.parse(JSON.stringify(link)),
      network: String(link.network),
    })),
  };

  return <ProductForm productId={id} initialValues={initialValues} />;
}
