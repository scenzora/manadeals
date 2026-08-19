import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { UsersClient } from "./users-client";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const { session, denied } = await guardPage(["users.view"]);
  if (denied) return denied;

  return <UsersClient session={session} />;
}
