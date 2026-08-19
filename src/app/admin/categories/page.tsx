import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { CategoriesClient } from "./categories-client";

export const metadata: Metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const { session, denied } = await guardPage(["categories.view"]);
  if (denied) return denied;

  return <CategoriesClient session={session} />;
}
