import { adminRoute, ok } from "@/lib/api";
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
import type { DateRangePreset } from "@/types";

export const runtime = "nodejs";

export const GET = adminRoute("analytics.view", async (request) => {
  const searchParams = request.nextUrl.searchParams;
  const range = resolveDateRange(
    (searchParams.get("preset") as DateRangePreset) ?? "last-7-days",
    searchParams.get("from"),
    searchParams.get("to"),
  );

  const [stats, series, topProducts, topCategories, networks, devices, browsers, countries, referrers, performance] =
    await Promise.all([
      getDashboardStats(range),
      getTimeSeries(range),
      getTopProducts(range),
      getTopCategories(range),
      getNetworkBreakdown(range),
      getSegmentBreakdown(range, "device"),
      getSegmentBreakdown(range, "browser"),
      getSegmentBreakdown(range, "country"),
      getSegmentBreakdown(range, "referrer"),
      getProductPerformance(range),
    ]);

  return ok({
    range: { from: range.from, to: range.to, label: range.label },
    stats,
    series,
    topProducts,
    topCategories,
    networks,
    devices,
    browsers,
    countries,
    referrers,
    performance,
  });
});
