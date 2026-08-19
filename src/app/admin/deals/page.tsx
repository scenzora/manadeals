import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { DealsClient } from "./deals-client";

export const metadata: Metadata = { title: "Deals" };
export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const { session, denied } = await guardPage(["deals.view"]);
  if (denied) return denied;

  return <DealsClient session={session} />;
}
