import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

/** The admin panel is never indexed, whatever the storefront defaults are. */
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · ManaDeals Admin" },
  robots: { index: false, follow: false },
};

/**
 * Authenticated area. Auth pages live under `/admin/(auth)` with their own
 * layout, so everything rendered here is guaranteed to have a session.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return <AdminShell session={session}>{children}</AdminShell>;
}
