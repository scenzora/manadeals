import { loadOwnerStore } from "@/lib/owner-page";
import { PLAN_LIMITS } from "@/lib/plans";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const ROWS: { label: string; free: string; pro: string }[] = [
  { label: "Store address", free: "yourname.manadeals.online", pro: "Your own domain" },
  { label: "Home page sections", free: `${PLAN_LIMITS.free.homeSections}`, pro: "All" },
  { label: "Blog posts", free: `${PLAN_LIMITS.free.blogPosts}`, pro: "Unlimited" },
  { label: "“Powered by ManaDeals” badge", free: "Shown", pro: "Removable" },
  { label: "Analytics", free: "7-day trend", pro: "90 days, products & retailers" },
];

export default async function PlanPage() {
  const { store } = await loadOwnerStore();
  if (!store) return null;

  return (
    <>
      <PageHeader title="Billing & plan" description="Compare what each plan includes" />
      <div className="max-w-3xl space-y-4">
        <Card>
          <CardContent className="p-5 text-sm">
            You&apos;re on the <Badge variant="neutral">{store.plan}</Badge> plan.
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  <th className="p-3" />
                  <th className="p-3">Free</th>
                  <th className="p-3">Pro</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3 font-medium">{row.label}</td>
                    <td className="p-3">{row.free}</td>
                    <td className="p-3">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        {store.plan === "free" ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Online upgrades are coming soon. To move to Pro now, contact support and we&apos;ll switch your plan manually.
          </p>
        ) : null}
      </div>
    </>
  );
}
