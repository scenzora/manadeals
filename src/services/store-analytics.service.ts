import mongoose from "mongoose";

import Click from "@/models/Click";
import Product from "@/models/Product";
import { scoped } from "@/lib/tenant/scope";
import { limitsFor } from "@/lib/plans";

/** Click analytics for one store. Free stores get the trend; Pro adds product and retailer breakdowns. */
export async function getStoreAnalytics(tenantId: string, plan: string, days: number) {
  const full = limitsFor(plan).fullAnalytics;
  const windowDays = full ? Math.min(Math.max(days, 1), 90) : 7;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const clicks = scoped(Click, tenantId);

  const [perDay, perRetailer, perProduct, total] = await Promise.all([
    clicks.aggregate([
      { $match: { clickedAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$clickedAt", timezone: "Asia/Kolkata" } }, clicks: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    full
      ? clicks.aggregate([
          { $match: { clickedAt: { $gte: since } } },
          { $group: { _id: { $ifNull: ["$retailer", "other"] }, clicks: { $sum: 1 } } },
          { $sort: { clicks: -1 } },
        ])
      : [],
    full
      ? clicks.aggregate([
          { $match: { clickedAt: { $gte: since }, product: { $ne: null } } },
          { $group: { _id: "$product", clicks: { $sum: 1 } } },
          { $sort: { clicks: -1 } },
          { $limit: 10 },
        ])
      : [],
    clicks.countDocuments({ clickedAt: { $gte: since } }),
  ]);

  const names = new Map<string, string>();
  if (perProduct.length) {
    const products = await Product.find({ _id: { $in: perProduct.map((row: { _id: mongoose.Types.ObjectId }) => row._id) } })
      .select("name")
      .lean();
    products.forEach((product) => names.set(String(product._id), product.name));
  }

  return {
    days: windowDays,
    total,
    fullAnalytics: full,
    perDay: perDay.map((row: { _id: string; clicks: number }) => ({ date: row._id, clicks: row.clicks })),
    perRetailer: perRetailer.map((row: { _id: string; clicks: number }) => ({ name: row._id || "other", clicks: row.clicks })),
    perProduct: perProduct.map((row: { _id: mongoose.Types.ObjectId; clicks: number }) => ({
      name: names.get(String(row._id)) ?? "Removed product",
      clicks: row.clicks,
    })),
  };
}
