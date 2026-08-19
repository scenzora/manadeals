import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { ProfileClient } from "./profile-client";

export const metadata: Metadata = { title: "My profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { session, denied } = await guardPage([]);
  if (denied) return denied;

  return <ProfileClient session={session} />;
}
