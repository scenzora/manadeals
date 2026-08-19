import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { BannersClient } from "./banners-client";

export const metadata: Metadata = { title: "Banners" };
export const dynamic = "force-dynamic";

export default async function BannersPage() {
  const { session, denied } = await guardPage(["banners.view"]);
  if (denied) return denied;

  return <BannersClient session={session} />;
}
