import Link from "next/link";
import type { Metadata } from "next";
import {
  Boxes,
  Flame,
  IndianRupee,
  ListTree,
  MousePointerClick,
  Package,
  Percent,
  Users,
} from "lucide-react";

import connectToDatabase from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { resolveDateRange } from "@/lib/date-range";
import {
  getDashboardStats,
  getNetworkBreakdown,
  getTimeSeries,
  getTopCategories,
  getTopProducts,
} from "@/services/analytics.service";
import Product from "@/models/Product";
import Deal from "@/models/Deal";
import ActivityLog from "@/models/ActivityLog";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { DateRangeFilter } from "@/components/admin/date-range-filter";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import {
  ComparisonBarChart,
  DonutChart,
  HorizontalBarChart,
  TrendAreaChart,
} from "@/components/charts/charts";
import type { DateRangePreset } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const range = resolveDateRange((params.preset as DateRangePreset) ?? "last-7-days", params.from, params.to);

  await connectToDatabase();
  const session = await getSession();

  const [stats, series, topProducts, topCategories, networks, recentProducts, latestDeals, recentActivity] =
    await Promise.all([
      getDashboardStats(range),
      getTimeSeries(range),
      getTopProducts(range, 8),
      getTopCategories(range, 6),
      getNetworkBreakdown(range),
      Product.find({}).sort({ createdAt: -1 }).limit(6).select("name slug salePrice status createdAt").lean(),
      Deal.find({}).sort({ createdAt: -1 }).limit(5).select("title status endDate dealType").lean(),
      ActivityLog.find({}).sort({ createdAt: -1 }).limit(8).lean(),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${session?.name.split(" ")[0] ?? "Admin"}`}
        description={`Performance for ${range.label.toLowerCase()} across every affiliate network.`}
        actions={<DateRangeFilter />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Affiliate clicks"
          value={formatNumber(stats.clicks)}
          change={stats.clicksChange}
          icon={MousePointerClick}
        />
        <StatCard
          label="Estimated revenue"
          value={formatCurrency(stats.revenue)}
          change={stats.revenueChange}
          icon={IndianRupee}
          accent="success"
        />
        <StatCard
          label="Product views"
          value={formatNumber(stats.views)}
          change={stats.viewsChange}
          icon={Boxes}
          accent="info"
        />
        <StatCard
          label="Click-through rate"
          value={`${stats.ctr}%`}
          hint={`${formatNumber(stats.conversions)} conversions · ${stats.conversionRate}% conv. rate`}
          icon={Percent}
          accent="navy"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total products"
          value={formatNumber(stats.totalProducts)}
          hint={`${formatNumber(stats.activeProducts)} active`}
          icon={Package}
          accent="navy"
        />
        <StatCard
          label="Categories"
          value={formatNumber(stats.totalCategories)}
          hint="Active categories"
          icon={ListTree}
          accent="navy"
        />
        <StatCard
          label="Registered users"
          value={formatNumber(stats.totalUsers)}
          hint="Lifetime signups"
          icon={Users}
          accent="info"
        />
        <StatCard
          label="Live deals"
          value={formatNumber(stats.activeDeals)}
          hint={`Lifetime revenue ${formatCurrency(stats.lifetimeRevenue)}`}
          icon={Flame}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Clicks, views &amp; revenue</CardTitle>
          <Badge variant="neutral">{range.label}</Badge>
        </CardHeader>
        <CardContent>
          {series.length === 0 ? (
            <EmptyState title="No activity in this period" description="Try a wider date range." />
          ) : (
            <TrendAreaChart
              data={series}
              series={[
                { key: "clicks", label: "Clicks", color: "#FF6B00" },
                { key: "views", label: "Views", color: "#2E90FA" },
                { key: "revenue", label: "Revenue", color: "#12B76A", currency: true },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top performing products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <EmptyState title="No clicks recorded yet" />
            ) : (
              <HorizontalBarChart
                data={topProducts.map((product) => ({
                  name: product.name.length > 28 ? `${product.name.slice(0, 28)}…` : product.name,
                  value: product.value,
                }))}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Network split</CardTitle>
          </CardHeader>
          <CardContent>
            {networks.length === 0 ? (
              <EmptyState title="No network data" />
            ) : (
              <DonutChart data={networks.map(({ name, value }) => ({ name, value }))} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top categories</CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <EmptyState title="No category data" />
            ) : (
              <ComparisonBarChart data={topCategories} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently added products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentProducts.length === 0 ? (
              <EmptyState title="No products yet" />
            ) : (
              recentProducts.map((product) => (
                <Link
                  key={String(product._id)}
                  href={`/admin/products/${String(product._id)}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm transition-colors hover:bg-[var(--muted)]"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{product.name}</span>
                  <span className="shrink-0 text-[var(--muted-foreground)]">
                    {formatCurrency(product.salePrice)}
                  </span>
                  <StatusBadge status={product.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Latest deals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestDeals.length === 0 ? (
              <EmptyState title="No deals yet" />
            ) : (
              latestDeals.map((deal) => (
                <div
                  key={String(deal._id)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{deal.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Ends {formatDateTime(deal.endDate)}
                    </p>
                  </div>
                  <StatusBadge status={deal.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent admin activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {recentActivity.length === 0 ? (
              <EmptyState title="No activity logged yet" />
            ) : (
              recentActivity.map((entry) => (
                <div key={String(entry._id)} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
                  <div className="min-w-0">
                    <p className="truncate">
                      <span className="font-medium">{entry.adminName}</span>{" "}
                      <span className="text-[var(--muted-foreground)]">
                        {entry.action} · {entry.module}
                      </span>
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {entry.description || "—"} · {formatDateTime(entry.createdAt as unknown as Date)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
