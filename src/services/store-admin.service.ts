import mongoose from "mongoose";

import Click from "@/models/Click";
import StoreOwner from "@/models/StoreOwner";
import Tenant from "@/models/Tenant";
import TenantDomain from "@/models/TenantDomain";
import { escapeRegex } from "@/lib/utils/slug";

export type AdminStoreRow = {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro";
  status: "draft" | "active" | "suspended";
  suspendedReason: string;
  ownerEmail: string;
  createdAt: string;
  domain: { hostname: string; verificationStatus: string; sslStatus: string } | null;
  clicks30d: number;
  clicksTotal: number;
};

/**
 * Platform-wide store listing for the admin panel. This is the one place that
 * deliberately reads across tenants, so it lives behind `adminRoute` only.
 */
export async function listStoresForAdmin(input: { q?: string; status?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = {};
  if (input.status && ["draft", "active", "suspended"].includes(input.status)) filter.status = input.status;
  if (input.q) {
    const regex = new RegExp(escapeRegex(input.q), "i");
    filter.$or = [{ name: regex }, { slug: regex }];
  }

  const [tenants, total] = await Promise.all([
    Tenant.find(filter)
      .sort({ createdAt: -1 })
      .skip((input.page - 1) * input.limit)
      .limit(input.limit)
      .lean(),
    Tenant.countDocuments(filter),
  ]);

  const ids = tenants.map((tenant) => tenant._id);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [owners, domains, clicks] = await Promise.all([
    StoreOwner.find({ tenant: { $in: ids } }).select("email tenant").lean(),
    TenantDomain.find({ tenant: { $in: ids } }).lean(),
    Click.aggregate<{ _id: mongoose.Types.ObjectId; total: number; recent: number }>([
      { $match: { tenant: { $in: ids } } },
      { $group: { _id: "$tenant", total: { $sum: 1 }, recent: { $sum: { $cond: [{ $gte: ["$clickedAt", since] }, 1, 0] } } } },
    ]),
  ]);

  const items: AdminStoreRow[] = tenants.map((tenant) => {
    const owner = owners.find((entry) => String(entry.tenant) === String(tenant._id));
    const domain = domains.find((entry) => String(entry.tenant) === String(tenant._id));
    const stats = clicks.find((entry) => String(entry._id) === String(tenant._id));
    return {
      id: String(tenant._id),
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      status: tenant.status,
      suspendedReason: tenant.suspendedReason ?? "",
      ownerEmail: owner?.email ?? "",
      createdAt: (tenant as unknown as { createdAt: Date }).createdAt.toISOString(),
      domain: domain
        ? { hostname: domain.hostname, verificationStatus: domain.verificationStatus, sslStatus: domain.sslStatus }
        : null,
      clicks30d: stats?.recent ?? 0,
      clicksTotal: stats?.total ?? 0,
    };
  });

  return { items, total, page: input.page, limit: input.limit, totalPages: Math.max(1, Math.ceil(total / input.limit)) };
}
