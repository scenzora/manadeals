import type { Metadata } from "next";
import Image from "next/image";
import { IndianRupee, MousePointerClick, Percent, Eye } from "lucide-react";

import connectToDatabase from "@/lib/mongodb";
import { guardPage } from "@/lib/page-guard";
import { resolveDateRange } from "@/lib/date-range";
import {
  getDashboardStats,
  getNetworkBreakdown,
  getProductPerformance,
  getSegmentBreakdown,
  getTimeSeries,
  getTopCategories,
  getTopProducts,
} from "@/services/analytics.service";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { DateRangeFilter } from "@/components/admin/date-range-filter";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import {
  ComparisonBarChart,
  DonutChart,
  HorizontalBarChart,
  TrendAreaChart,
} from "@/components/charts/charts";
import type { DateRangePreset } from "@/types";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const { denied } = await guardPage(["analytics.view"]);
  if (denied) return denied;

  const params = await searchParams;
  const range = resolveDateRange(
    (params.preset as DateRangePreset) ?? "last-30-days",
    params.from,
    params.to,
  );

  await connectToDatabase();
  const [stats, series, topProducts, topCategories, networks, devices, countries, referrers, performance] =
    await Promise.all([
      getDashboardStats(range),
      getTimeSeries(range),
      getTopProducts(range, 10),
      getTopCategories(range, 8),
      getNetworkBreakdown(range),
      getSegmentBreakdown(range, "device"),
      getSegmentBreakdown(range, "country"),
      getSegmentBreakdown(range, "referrer"),
      getProductPerformance(range, 20),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Views, outbound clicks, conversion and estimated revenue by network."
        actions={<DateRangeFilter />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Product views" value={formatNumber(stats.views)} change={stats.viewsChange} icon={Eye} accent="info" />
        <StatCard
          label="Affiliate clicks"
          value={formatNumber(stats.clicks)}
          change={stats.clicksChange}
          icon={MousePointerClick}
        />
        <StatCard label="CTR" value={`${stats.ctr}%`} hint="Clicks ÷ views" icon={Percent} accent="navy" />
        <StatCard
          label="Estimated revenue"
          value={formatCurrency(stats.revenue)}
          change={stats.revenueChange}
          icon={IndianRupee}
          accent="success"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Traffic &amp; revenue trend</CardTitle>
        </CardHeader>
        <CardContent>
          {series.length === 0 ? (
            <EmptyState title="No activity in this period" />
          ) : (
            <TrendAreaChart
              data={series}
              series={[
                { key: "views", label: "Views", color: "#2E90FA" },
                { key: "clicks", label: "Clicks", color: "#FF6B00" },
                { key: "revenue", label: "Revenue", color: "#12B76A", currency: true },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Affiliate networks</CardTitle>
          </CardHeader>
          <CardContent>
            {networks.length === 0 ? <EmptyState title="No data" /> : <DonutChart data={networks} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Devices</CardTitle>
          </CardHeader>
          <CardContent>
            {devices.length === 0 ? <EmptyState title="No data" /> : <DonutChart data={devices} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top countries</CardTitle>
          </CardHeader>
          <CardContent>
            {countries.length === 0 ? (
              <EmptyState title="No data" />
            ) : (
              <ComparisonBarChart data={countries.slice(0, 5)} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top products by clicks</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <EmptyState title="No clicks recorded" />
            ) : (
              <HorizontalBarChart
                data={topProducts.map((product) => ({
                  name: product.name.length > 26 ? `${product.name.slice(0, 26)}…` : product.name,
                  value: product.value,
                }))}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top categories</CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <EmptyState title="No data" />
            ) : (
              <HorizontalBarChart data={topCategories} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Traffic sources</CardTitle>
        </CardHeader>
        <CardContent>
          {referrers.length === 0 ? (
            <EmptyState title="No referrer data" />
          ) : (
            <ComparisonBarChart data={referrers} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product performance</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {performance.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState title="No product performance data" />
            </div>
          ) : (
            <TableWrapper className="rounded-none border-0">
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Product</TH>
                    <TH>Views</TH>
                    <TH>Clicks</TH>
                    <TH>CTR</TH>
                    <TH>Conversions</TH>
                    <TH>Est. revenue</TH>
                  </TR>
                </THead>
                <TBody>
                  {performance.map((row) => (
                    <TR key={row.id}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <span className="relative size-9 shrink-0 overflow-hidden rounded-md bg-[var(--muted)]">
                            {row.thumbnail ? (
                              <Image
                                src={row.thumbnail}
                                alt=""
                                fill
                                sizes="36px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : null}
                          </span>
                          <span className="line-clamp-1 font-medium">{row.name}</span>
                        </div>
                      </TD>
                      <TD>{formatNumber(row.views)}</TD>
                      <TD>{formatNumber(row.clicks)}</TD>
                      <TD>{row.ctr}%</TD>
                      <TD>{formatNumber(row.conversions)}</TD>
                      <TD className="font-medium">{formatCurrency(row.revenue)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrapper>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
