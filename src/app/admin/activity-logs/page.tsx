import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { ActivityLogsClient } from "./activity-logs-client";

export const metadata: Metadata = { title: "Activity logs" };
export const dynamic = "force-dynamic";

export default async function ActivityLogsPage() {
  const { denied } = await guardPage(["activity-logs.view"]);
  if (denied) return denied;

  return <ActivityLogsClient />;
}
