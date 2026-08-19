import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { PriceTrackingClient } from "./price-tracking-client";

export const metadata: Metadata = { title: "Price tracking" };
export const dynamic = "force-dynamic";

export default async function PriceTrackingPage() {
  const { session, denied } = await guardPage(["price-tracking.view"]);
  if (denied) return denied;

  return <PriceTrackingClient session={session} />;
}
