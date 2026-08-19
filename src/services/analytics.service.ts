import { Types } from "mongoose";

import Click from "@/models/Click";
import ProductView from "@/models/ProductView";
import Product from "@/models/Product";
import Category from "@/models/Category";
import AffiliateNetwork from "@/models/AffiliateNetwork";
import User from "@/models/User";
import Deal from "@/models/Deal";
import { bucketFor, mongoDateFormat, previousRange, type DateRange } from "@/lib/date-range";

export type SeriesPoint = { date: string; clicks: number; views: number; revenue: number };
export type NamedValue = { name: string; value: number; secondary?: number };

function percentChange(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

/** Headline counters, each with a period-over-period delta. */
export async function getDashboardStats(range: DateRange) {
  const previous = previousRange(range);
  const rangeMatch = { clickedAt: { $gte: range.from, $lte: range.to } };
  const previousMatch = { clickedAt: { $gte: previous.from, $lte: previous.to } };

  const [
    totalProducts,
    activeProducts,
    totalCategories,
    totalUsers,
    activeDeals,
    currentClicks,
    priorClicks,
    currentViews,
    priorViews,
  ] = await Promise.all([
    Product.countDocuments({}),
    Product.countDocuments({ status: "active" }),
    Category.countDocuments({ status: "active" }),
    User.countDocuments({}),
    Deal.countDocuments({ status: "active", endDate: { $gte: new Date() } }),
    Click.aggregate<{ clicks: number; revenue: number; conversions: number }>([
      { $match: rangeMatch },
      {
        $group: {
          _id: null,
          clicks: { $sum: 1 },
          revenue: { $sum: "$estimatedRevenue" },
          conversions: { $sum: { $cond: ["$converted", 1, 0] } },
        },
      },
    ]),
    Click.aggregate<{ clicks: number; revenue: number }>([
      { $match: previousMatch },
      { $group: { _id: null, clicks: { $sum: 1 }, revenue: { $sum: "$estimatedRevenue" } } },
    ]),
    ProductView.countDocuments({ viewedAt: { $gte: range.from, $lte: range.to } }),
    ProductView.countDocuments({ viewedAt: { $gte: previous.from, $lte: previous.to } }),
  ]);

  const clicks = currentClicks[0]?.clicks ?? 0;
  const revenue = currentClicks[0]?.revenue ?? 0;
  const conversions = currentClicks[0]?.conversions ?? 0;
  const previousClicks = priorClicks[0]?.clicks ?? 0;
  const previousRevenue = priorClicks[0]?.revenue ?? 0;

  const [lifetimeClicks, lifetimeRevenue] = await Promise.all([
    Click.estimatedDocumentCount(),
    Click.aggregate<{ revenue: number }>([
      { $group: { _id: null, revenue: { $sum: "$estimatedRevenue" } } },
    ]),
  ]);

  return {
    totalProducts,
    activeProducts,
    totalCategories,
    totalUsers,
    activeDeals,
    clicks,
    clicksChange: percentChange(clicks, previousClicks),
    views: currentViews,
    viewsChange: percentChange(currentViews, priorViews),
    revenue,
    revenueChange: percentChange(revenue, previousRevenue),
    conversions,
    conversionRate: clicks ? Number(((conversions / clicks) * 100).toFixed(2)) : 0,
    ctr: currentViews ? Number(((clicks / currentViews) * 100).toFixed(2)) : 0,
    lifetimeClicks,
    lifetimeRevenue: lifetimeRevenue[0]?.revenue ?? 0,
  };
}

/** Clicks / views / revenue bucketed over the range for the trend chart. */
export async function getTimeSeries(range: DateRange): Promise<SeriesPoint[]> {
  const bucket = bucketFor(range);
  const format = mongoDateFormat(bucket);

  const [clickSeries, viewSeries] = await Promise.all([
    Click.aggregate<{ _id: string; clicks: number; revenue: number }>([
      { $match: { clickedAt: { $gte: range.from, $lte: range.to } } },
      {
        $group: {
          _id: { $dateToString: { format, date: "$clickedAt" } },
          clicks: { $sum: 1 },
          revenue: { $sum: "$estimatedRevenue" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    ProductView.aggregate<{ _id: string; views: number }>([
      { $match: { viewedAt: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: { $dateToString: { format, date: "$viewedAt" } }, views: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const merged = new Map<string, SeriesPoint>();
  for (const point of clickSeries) {
    merged.set(point._id, {
      date: point._id,
      clicks: point.clicks,
      revenue: Math.round(point.revenue),
      views: 0,
    });
  }
  for (const point of viewSeries) {
    const existing = merged.get(point._id);
    if (existing) existing.views = point.views;
    else merged.set(point._id, { date: point._id, clicks: 0, revenue: 0, views: point.views });
  }

  return [...merged.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTopProducts(range: DateRange, limit = 8) {
  return Click.aggregate<NamedValue & { id: string }>([
    { $match: { clickedAt: { $gte: range.from, $lte: range.to }, product: { $ne: null } } },
    { $group: { _id: "$product", value: { $sum: 1 }, secondary: { $sum: "$estimatedRevenue" } } },
    { $sort: { value: -1 } },
    { $limit: limit },
    { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
    { $unwind: "$product" },
    {
      $project: {
        _id: 0,
        id: { $toString: "$_id" },
        name: "$product.name",
        value: 1,
        secondary: { $round: ["$secondary", 0] },
      },
    },
  ]);
}

export async function getTopCategories(range: DateRange, limit = 6) {
  return Click.aggregate<NamedValue>([
    { $match: { clickedAt: { $gte: range.from, $lte: range.to }, product: { $ne: null } } },
    { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "product" } },
    { $unwind: "$product" },
    { $group: { _id: "$product.category", value: { $sum: 1 } } },
    { $sort: { value: -1 } },
    { $limit: limit },
    { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
    { $unwind: "$category" },
    { $project: { _id: 0, name: "$category.name", value: 1 } },
  ]);
}

export async function getNetworkBreakdown(range: DateRange) {
  return Click.aggregate<NamedValue>([
    { $match: { clickedAt: { $gte: range.from, $lte: range.to }, affiliateNetwork: { $ne: null } } },
    { $group: { _id: "$affiliateNetwork", value: { $sum: 1 }, secondary: { $sum: "$estimatedRevenue" } } },
    { $sort: { value: -1 } },
    { $lookup: { from: "affiliatenetworks", localField: "_id", foreignField: "_id", as: "network" } },
    { $unwind: "$network" },
    { $project: { _id: 0, name: "$network.name", value: 1, secondary: { $round: ["$secondary", 0] } } },
  ]);
}

export async function getSegmentBreakdown(range: DateRange, field: "device" | "browser" | "country" | "referrer") {
  return Click.aggregate<NamedValue>([
    { $match: { clickedAt: { $gte: range.from, $lte: range.to } } },
    { $group: { _id: `$${field}`, value: { $sum: 1 } } },
    { $sort: { value: -1 } },
    { $limit: 8 },
    { $project: { _id: 0, name: { $ifNull: ["$_id", "unknown"] }, value: 1 } },
  ]);
}

/** Per-product performance table used by /admin/analytics. */
export async function getProductPerformance(range: DateRange, limit = 20) {
  const clicks = await Click.aggregate<{
    _id: Types.ObjectId;
    clicks: number;
    revenue: number;
    conversions: number;
  }>([
    { $match: { clickedAt: { $gte: range.from, $lte: range.to }, product: { $ne: null } } },
    {
      $group: {
        _id: "$product",
        clicks: { $sum: 1 },
        revenue: { $sum: "$estimatedRevenue" },
        conversions: { $sum: { $cond: ["$converted", 1, 0] } },
      },
    },
    { $sort: { clicks: -1 } },
    { $limit: limit },
  ]);

  const productIds = clicks.map((entry) => entry._id);
  const [products, views] = await Promise.all([
    Product.find({ _id: { $in: productIds } })
      .select("name slug thumbnail salePrice")
      .lean(),
    ProductView.aggregate<{ _id: Types.ObjectId; views: number }>([
      { $match: { product: { $in: productIds }, viewedAt: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: "$product", views: { $sum: 1 } } },
    ]),
  ]);

  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const viewMap = new Map(views.map((entry) => [String(entry._id), entry.views]));

  return clicks.map((entry) => {
    const id = String(entry._id);
    const product = productMap.get(id);
    const productViews = viewMap.get(id) ?? 0;
    return {
      id,
      name: product?.name ?? "Deleted product",
      thumbnail: product?.thumbnail ?? "",
      price: product?.salePrice ?? 0,
      clicks: entry.clicks,
      views: productViews,
      revenue: Math.round(entry.revenue),
      ctr: productViews ? Number(((entry.clicks / productViews) * 100).toFixed(2)) : 0,
      conversions: entry.conversions,
    };
  });
}

export async function getNetworkNames() {
  const networks = await AffiliateNetwork.find({ status: "active" }).select("name code").lean();
  return networks.map((network) => ({ id: String(network._id), name: network.name, code: network.code }));
}
