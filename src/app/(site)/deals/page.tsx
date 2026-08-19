import type { Metadata } from "next";

import { listDeals } from "@/services/storefront.service";
import { buildMetadata } from "@/lib/seo";
import { formatNumber } from "@/lib/utils/format";
import { DealCard, type PublicDeal } from "@/components/site/deal-card";
import { Breadcrumbs, Section, SiteEmptyState, SitePagination } from "@/components/site/ui";

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Today's best deals",
    description:
      "Live deals across Amazon, Flipkart and more — flash sales, deal of the day and limited-time offers, updated continuously.",
    path: "/deals",
  });
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const result = await listDeals(Number(page) || 1);

  return (
    <Section>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Deals" }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Today&apos;s best deals</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {formatNumber(result.total)} live offer{result.total === 1 ? "" : "s"} · expired deals are
          removed automatically
        </p>
      </div>

      {result.items.length === 0 ? (
        <SiteEmptyState
          title="No live deals right now"
          description="New deals are added every day — check back soon."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(result.items as PublicDeal[]).map((deal) => (
              <DealCard key={deal._id} deal={deal} />
            ))}
          </div>
          <SitePagination
            page={result.page}
            totalPages={result.totalPages}
            buildHref={(nextPage) => `/deals?page=${nextPage}`}
          />
        </>
      )}
    </Section>
  );
}
