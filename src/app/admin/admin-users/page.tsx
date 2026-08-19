import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { AdminUsersClient } from "./admin-users-client";

export const metadata: Metadata = { title: "Admins & roles" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { session, denied } = await guardPage(["admins.view", "admins.manage"]);
  if (denied) return denied;

  return <AdminUsersClient session={session} />;
}
