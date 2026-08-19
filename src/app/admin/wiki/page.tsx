import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { WikiClient } from "./wiki-client";

export const metadata: Metadata = { title: "Wiki" };
export const dynamic = "force-dynamic";

export default async function WikiPage() {
  const { session, denied } = await guardPage(["wiki.view"]);
  if (denied) return denied;

  return <WikiClient session={session} />;
}
