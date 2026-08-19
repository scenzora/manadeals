import type { Metadata } from "next";

import { guardPage } from "@/lib/page-guard";
import { isR2Configured, r2ConfigurationIssue, R2_PUBLIC_URL } from "@/lib/r2";
import { MediaClient } from "./media-client";

export const metadata: Metadata = { title: "Media" };
export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const { session, denied } = await guardPage(["media.view"]);
  if (denied) return denied;

  return (
    <MediaClient
      session={session}
      storage={{
        configured: isR2Configured,
        issue: r2ConfigurationIssue(),
        publicUrl: R2_PUBLIC_URL,
      }}
    />
  );
}
