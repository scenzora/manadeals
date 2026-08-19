import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { CouponsClient } from "./coupons-client";

export const metadata: Metadata = { title: "Coupons" };
export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  const { session, denied } = await guardPage(["coupons.view"]);
  if (denied) return denied;

  return <CouponsClient session={session} />;
}
