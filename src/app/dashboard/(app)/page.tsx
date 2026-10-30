import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { loadOwnerStore } from "@/lib/owner-page";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PublishButton } from "@/components/dashboard/publish-button";

export default async function DashboardHome() {
  const { store } = await loadOwnerStore();
  if (!store) return null;

  const checklist = [
    { done: Boolean(store.branding.logoUrl), label: "Add a logo", href: "/dashboard/branding" },
    { done: Boolean(store.affiliate.amazonAssociateTag || store.affiliate.flipkartAffiliateId), label: "Add your affiliate IDs", href: "/dashboard/affiliate" },
    { done: store.catalog.categories.length > 0, label: "Choose your categories", href: "/dashboard/catalog" },
    { done: store.status === "active", label: "Publish your store", href: "/dashboard" },
  ];

  return (
    <>
      <PageHeader
        title={store.name}
        description="Your white-label deals store"
        actions={
          <a href={store.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-[var(--primary)] underline">
            {store.url.replace(/^https?:\/\//, "")} <ExternalLink className="size-3.5" />
          </a>
        }
      />
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-2 text-sm">
              Status <Badge variant={store.status === "active" ? "success" : "neutral"}>{store.status}</Badge>
              Plan <Badge variant="neutral">{store.plan}</Badge>
            </div>
            {store.status === "draft" ? <PublishButton /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-5">
            <h2 className="text-sm font-semibold">Getting set up</h2>
            {checklist.map((item) => (
              <Link key={item.label} href={item.href} className="flex items-center gap-2 text-sm hover:underline">
                <span className={item.done ? "text-[var(--success)]" : "text-[var(--muted-foreground)]"}>{item.done ? "✓" : "○"}</span>
                {item.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
