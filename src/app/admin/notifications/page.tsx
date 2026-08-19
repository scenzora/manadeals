import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { NotificationsClient } from "./notifications-client";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { session, denied } = await guardPage(["notifications.view"]);
  if (denied) return denied;

  return <NotificationsClient session={session} />;
}
