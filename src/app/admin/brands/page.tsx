import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { BrandsClient } from "./brands-client";

export const metadata: Metadata = { title: "Brands" };
export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const { session, denied } = await guardPage(["brands.view"]);
  if (denied) return denied;

  return <BrandsClient session={session} />;
}
