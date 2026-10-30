import { redirect } from "next/navigation";

import { getOwnerSession } from "@/lib/owner-auth";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function OwnerPublicLayout({ children }: { children: React.ReactNode }) {
  if (await getOwnerSession()) redirect("/dashboard");
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8">{children}</div>
    </div>
  );
}
