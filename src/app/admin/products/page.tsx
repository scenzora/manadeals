import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { ProductsClient } from "./products-client";

export const metadata: Metadata = { title: "Products" };
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { session, denied } = await guardPage(["products.view"]);
  if (denied) return denied;

  return <ProductsClient session={session} />;
}
