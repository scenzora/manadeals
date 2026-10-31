import Link from "next/link";

import connectToDatabase from "@/lib/mongodb";
import { loadOwnerStore } from "@/lib/owner-page";
import { PLAN_LIMITS } from "@/lib/plans";
import {
  GRACE_DAYS,
  PRO_LIST_PRICE_PAISE,
  PRO_PRICE_PAISE,
  subscriptionState,
} from "@/lib/billing";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { listInvoices } from "@/services/billing.service";
import Tenant from "@/models/Tenant";
import { PageHeader } from "@/components/admin/page-header";
import { PayButton } from "@/components/dashboard/pay-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const ROWS: { label: string; free: string; pro: string }[] = [
  { label: "Store address", free: "yourname.manadeals.online", pro: "Your own domain" },
  { label: "Home page sections", free: `${PLAN_LIMITS.free.homeSections}`, pro: "All" },
  { label: "Blog posts", free: `${PLAN_LIMITS.free.blogPosts}`, pro: "Unlimited" },
  { label: "“Powered by ManaDeals” badge", free: "Shown", pro: "Removable" },
  { label: "Analytics", free: "7-day trend", pro: "90 days, products & retailers" },
];

export default async function PlanPage() {
  const { owner, store } = await loadOwnerStore();
  if (!store) return null;

  await connectToDatabase();
  const [tenant, invoices] = await Promise.all([
    Tenant.findById(store.id).select("planExpiresAt").lean(),
    listInvoices(store.id),
  ]);
  const expiresAt = tenant?.planExpiresAt ?? null;
  const { state, daysLeft } = subscriptionState(store.plan, expiresAt);

  const action =
    state === "free" ? "Upgrade to Pro" : state === "manual" ? null : state === "active" ? "Renew early" : "Renew now";

  return (
    <>
      <PageHeader title="Billing & plan" description="Your subscription, renewals and invoices" />
      <div className="max-w-3xl space-y-4">
        <Card>
          <CardContent className="space-y-3 p-5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p>
                  You&apos;re on the <Badge variant={store.plan === "pro" ? "success" : "neutral"}>{store.plan}</Badge>{" "}
                  plan.
                </p>
                {state === "free" ? (
                  <p className="text-[var(--muted-foreground)]">
                    Pro is{" "}
                    <strong className="text-[var(--foreground)]">{formatCurrency(PRO_PRICE_PAISE / 100)}/year</strong>{" "}
                    <span className="line-through">{formatCurrency(PRO_LIST_PRICE_PAISE / 100)}</span>. Your own domain,
                    full analytics, no badge.
                  </p>
                ) : null}
                {state === "manual" ? (
                  <p className="text-[var(--muted-foreground)]">Your Pro plan was granted by our team and has no end date.</p>
                ) : null}
                {state === "active" && expiresAt ? (
                  <p className="text-[var(--muted-foreground)]">
                    Active until <strong className="text-[var(--foreground)]">{formatDate(expiresAt)}</strong> ({daysLeft}{" "}
                    days left).
                  </p>
                ) : null}
              </div>
              {action ? (
                <PayButton
                  label={`${action} — ${formatCurrency(PRO_PRICE_PAISE / 100)}`}
                  storeName={store.name}
                  ownerName={owner.name}
                  ownerEmail={owner.email}
                />
              ) : null}
            </div>

            {state === "expiring" && expiresAt ? (
              <p className="rounded-md bg-[#fffaeb] p-3 text-[var(--warning)]">
                Your Pro plan expires on {formatDate(expiresAt)} ({daysLeft} days left). Renew now to keep your custom
                domain and Pro features. Unused days carry over.
              </p>
            ) : null}
            {state === "grace" && expiresAt ? (
              <p className="rounded-md bg-[#fef3f2] p-3 text-[var(--destructive)]">
                Your Pro plan expired on {formatDate(expiresAt)}. Pro features stay on for a {GRACE_DAYS}-day grace
                period, then your store moves to Free. Renew now to avoid losing them.
              </p>
            ) : null}
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

        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {invoices.length === 0 ? (
              <p className="p-5 text-sm text-[var(--muted-foreground)]">No invoices yet. They appear here after a payment.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-[var(--border)] text-left">
                    <th className="p-3">Invoice</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Period</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="p-3 font-medium">{invoice.number}</td>
                      <td className="p-3">{formatDate(invoice.paidAt)}</td>
                      <td className="p-3">
                        {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
                      </td>
                      <td className="p-3">{formatCurrency(invoice.total / 100)}</td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/dashboard/plan/invoices/${invoice.id}`}
                          className="font-medium text-[var(--primary)] hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
