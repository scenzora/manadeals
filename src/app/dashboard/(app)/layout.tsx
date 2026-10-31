import { redirect } from "next/navigation";

import connectToDatabase from "@/lib/mongodb";
import { getOwnerSession } from "@/lib/owner-auth";
import Tenant from "@/models/Tenant";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Store dashboard", robots: { index: false, follow: false } };

/** The proxy only checks that a cookie exists; the signature is verified here. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const owner = await getOwnerSession();
  if (!owner) redirect("/dashboard/login");

  let storeName = "";
  let logoUrl = "";
  if (owner.tenantId) {
    await connectToDatabase();
    const tenant = await Tenant.findById(owner.tenantId).select("name branding.logoUrl").lean();
    storeName = tenant?.name ?? "";
    logoUrl = tenant?.branding?.logoUrl ?? "";
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="bg-[var(--sidebar)] p-3 md:p-4">
        <div className="mb-3 hidden px-3 md:block">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded asset, already sized
            <img src={logoUrl} alt={storeName || "Your logo"} className="max-h-12 max-w-full rounded bg-white/95 object-contain p-1.5" />
          ) : (
            <p className="text-sm font-semibold text-white">{storeName || owner.name}</p>
          )}
          <p className="mt-2 text-xs uppercase tracking-wide text-[var(--sidebar-foreground)]">{owner.name}</p>
        </div>
        <DashboardNav />
      </aside>
      <main className="min-w-0 p-4 sm:p-6">{children}</main>
    </div>
  );
}
