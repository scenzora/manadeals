import type { Metadata } from "next";

import connectToDatabase from "@/lib/mongodb";
import { guardPage } from "@/lib/page-guard";
import { loadSettings } from "@/services/settings.service";
import { hasPermission } from "@/lib/permissions";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { session, denied } = await guardPage(["settings.view"]);
  if (denied) return denied;

  await connectToDatabase();
  const settings = await loadSettings();

  return (
    <SettingsClient
      settings={JSON.parse(JSON.stringify(settings))}
      canManage={hasPermission(session, "settings.manage")}
    />
  );
}
