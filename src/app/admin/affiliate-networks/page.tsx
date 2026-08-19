import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { NetworksClient } from "./networks-client";

export const metadata: Metadata = { title: "Affiliate networks" };
export const dynamic = "force-dynamic";

export default async function AffiliateNetworksPage() {
  const { session, denied } = await guardPage(["affiliate-networks.view"]);
  if (denied) return denied;

  return <NetworksClient session={session} />;
}
