import { redirect } from "next/navigation";

import { getOwnerSession } from "@/lib/owner-auth";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Store dashboard", robots: { index: false, follow: false } };

/** The proxy only checks that a cookie exists; the signature is verified here. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const owner = await getOwnerSession();
  if (!owner) redirect("/dashboard/login");

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="bg-[var(--sidebar)] p-3 md:p-4">
        <p className="mb-3 hidden px-3 text-xs uppercase tracking-wide text-[var(--sidebar-foreground)] md:block">
          {owner.name}
        </p>
        <DashboardNav />
      </aside>
      <main className="min-w-0 p-4 sm:p-6">{children}</main>
    </div>
  );
}
