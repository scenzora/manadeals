import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { ReviewsClient } from "./reviews-client";

export const metadata: Metadata = { title: "Product reviews" };
export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const { session, denied } = await guardPage(["products.view"]);
  if (denied) return denied;

  return <ReviewsClient session={session} />;
}
