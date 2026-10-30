"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { apiClient } from "@/lib/api-client";
import { HorizontalBarChart, TrendAreaChart } from "@/components/charts/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/input";

type Analytics = {
  days: number;
  total: number;
  fullAnalytics: boolean;
  perDay: { date: string; clicks: number }[];
  perRetailer: { name: string; clicks: number }[];
  perProduct: { name: string; clicks: number }[];
};

export function AnalyticsView() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    apiClient.get<Analytics>(`/api/owner/analytics?days=${days}`).then(setData).catch(() => setData(null));
  }, [days]);

  if (!data) return <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">
          <strong className="text-2xl text-[var(--foreground)]">{data.total}</strong> outbound clicks in the last {data.days} days
        </p>
        {data.fullAnalytics ? (
          <NativeSelect value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-36" aria-label="Date range">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </NativeSelect>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clicks per day</CardTitle>
        </CardHeader>
        <CardContent>
          {data.perDay.length ? (
            <TrendAreaChart data={data.perDay} series={[{ key: "clicks", label: "Clicks" }]} />
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">No clicks yet.</p>
          )}
        </CardContent>
      </Card>

      {data.fullAnalytics ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top products</CardTitle>
            </CardHeader>
            <CardContent>
              {data.perProduct.length ? (
                <HorizontalBarChart data={data.perProduct.map((row) => ({ name: row.name, value: row.clicks }))} />
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">No product clicks yet.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>By retailer</CardTitle>
            </CardHeader>
            <CardContent>
              {data.perRetailer.length ? (
                <HorizontalBarChart data={data.perRetailer.map((row) => ({ name: row.name, value: row.clicks }))} />
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">No retailer clicks yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
          Product and retailer breakdowns and 90-day history are part of Pro.{" "}
          <Link href="/dashboard/plan" className="font-medium text-[var(--primary)] underline">
            See plans
          </Link>
        </p>
      )}
    </div>
  );
}
