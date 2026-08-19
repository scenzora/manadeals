import type { Metadata } from "next";

import { listCoupons } from "@/services/storefront.service";
import { buildMetadata } from "@/lib/seo";
import { formatNumber } from "@/lib/utils/format";
import { CouponCard, type PublicCoupon } from "@/components/site/coupon-card";
import { Breadcrumbs, Section, SiteEmptyState, SitePagination } from "@/components/site/ui";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Verified coupon codes",
    description:
      "Working discount codes for Amazon, Flipkart and more. Every coupon shows its minimum order, maximum discount and expiry.",
    path: "/coupons",
  });
}

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const result = await listCoupons(Number(page) || 1);

  return (
    <Section>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Coupons" }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Coupon codes</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {formatNumber(result.total)} active code{result.total === 1 ? "" : "s"} · tap a code to copy it
        </p>
      </div>

      {result.items.length === 0 ? (
        <SiteEmptyState
          title="No active coupons right now"
          description="We only list codes we have checked. Check back soon."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(result.items as PublicCoupon[]).map((coupon) => (
              <CouponCard key={coupon._id} coupon={coupon} />
            ))}
          </div>
          <SitePagination
            page={result.page}
            totalPages={result.totalPages}
            buildHref={(nextPage) => `/coupons?page=${nextPage}`}
          />
        </>
      )}
    </Section>
  );
}
