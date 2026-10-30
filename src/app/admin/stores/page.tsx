import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { StoresClient } from "./stores-client";

export const metadata: Metadata = { title: "White-label stores" };
export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const { session, denied } = await guardPage(["stores.view"]);
  if (denied) return denied;

  return <StoresClient session={session} />;
}
