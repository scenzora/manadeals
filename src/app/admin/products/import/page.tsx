import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { ImportClient } from "./import-client";

export const metadata: Metadata = { title: "Import products" };
export const dynamic = "force-dynamic";

export default async function ImportProductsPage() {
  const { denied } = await guardPage(["products.create"]);
  if (denied) return denied;

  return <ImportClient />;
}
