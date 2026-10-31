import "server-only";

import { ApiException } from "@/lib/api";
import {
  GRACE_DAYS,
  PRO_PRICE_PAISE,
  PRO_TERM_MONTHS,
  formatInvoiceNumber,
  gstRate,
  nextTerm,
  splitTax,
} from "@/lib/billing";
import { refreshStore } from "@/lib/tenant/store.server";
import { BillingOrder, Counter, Invoice } from "@/models/Invoice";
import StoreOwner from "@/models/StoreOwner";
import Tenant from "@/models/Tenant";
import TenantDomain from "@/models/TenantDomain";

const RAZORPAY_API = "https://api.razorpay.com/v1";

export function razorpayKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new ApiException("Online payments are not configured yet. Please contact support.", 503);
  return { keyId, keySecret };
}

/** Creates a Razorpay order for one Pro term and records it so the payment can be matched later. */
export async function createProOrder(tenantId: string, ownerId: string) {
  const { keyId, keySecret } = razorpayKeys();
  const tenant = await Tenant.findById(tenantId).select("status").lean();
  if (!tenant) throw new ApiException("Store not found", 404);
  if (tenant.status === "suspended") throw new ApiException("This store is suspended. Contact support.", 403);

  const response = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount: PRO_PRICE_PAISE,
      currency: "INR",
      receipt: `pro_${tenantId.slice(-8)}_${Date.now()}`,
      notes: { tenantId, ownerId, plan: "pro" },
    }),
  });
  if (!response.ok) throw new ApiException("Could not start the payment. Please try again.", 502);
  const order = (await response.json()) as { id: string };

  await BillingOrder.create({
    tenant: tenantId,
    owner: ownerId,
    razorpayOrderId: order.id,
    amount: PRO_PRICE_PAISE,
  });
  return { orderId: order.id, amount: PRO_PRICE_PAISE, currency: "INR", keyId };
}

async function nextInvoiceNumber(now: Date) {
  const year = now.getUTCFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: `invoice-${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return formatInvoiceNumber(year, counter.seq);
}

/**
 * Settles a paid order: extends the Pro term and issues the invoice. Safe to
 * call twice (checkout verify and the webhook both do): only the call that
 * flips the order from `created` to `paid` does the work.
 */
export async function fulfilOrder(razorpayOrderId: string, razorpayPaymentId: string) {
  const claimed = await BillingOrder.findOneAndUpdate(
    { razorpayOrderId, status: { $ne: "paid" } },
    { status: "paid", razorpayPaymentId },
    { new: true },
  );
  if (!claimed) {
    const existing = await BillingOrder.findOne({ razorpayOrderId }).lean();
    if (!existing) throw new ApiException("Unknown order", 404);
    return { alreadyProcessed: true as const };
  }

  const now = new Date();
  try {
    const [tenant, owner] = await Promise.all([
      Tenant.findById(claimed.tenant),
      StoreOwner.findById(claimed.owner).select("name email").lean(),
    ]);
    if (!tenant || !owner) throw new Error("Order references a missing store or owner");

    const { start, end } = nextTerm(tenant.plan === "pro" ? tenant.planExpiresAt : null, now);
    const rate = gstRate();
    const amounts = splitTax(claimed.amount, rate);

    tenant.plan = "pro";
    tenant.planExpiresAt = end;
    await tenant.save();

    await Invoice.create({
      number: await nextInvoiceNumber(now),
      tenant: tenant._id,
      order: claimed._id,
      razorpayPaymentId,
      description: `ManaDeals Pro plan — ${PRO_TERM_MONTHS} months`,
      periodStart: start,
      periodEnd: end,
      subtotal: amounts.subtotal,
      taxRate: rate,
      tax: amounts.tax,
      total: amounts.total,
      billTo: { name: owner.name, email: owner.email, store: tenant.name },
      paidAt: now,
    });

    const domains = await TenantDomain.find({ tenant: tenant._id }).select("hostname").lean();
    refreshStore(String(tenant._id), tenant.slug, domains.flatMap((d) => [d.hostname, `www.${d.hostname}`]));
    return { alreadyProcessed: false as const, expiresAt: end };
  } catch (error) {
    // Payment is captured but fulfilment failed: reopen the order so a webhook retry can finish it.
    await BillingOrder.updateOne({ _id: claimed._id }, { status: "created", razorpayPaymentId: "" });
    throw error;
  }
}

/** Downgrades stores whose Pro term and grace period have both ended. Run daily by cron. */
export async function expireLapsedPlans(now = new Date()) {
  const cutoff = new Date(now.getTime() - GRACE_DAYS * 86_400_000);
  const lapsed = await Tenant.find({ plan: "pro", planExpiresAt: { $ne: null, $lt: cutoff } }).select("slug");
  for (const tenant of lapsed) {
    tenant.plan = "free";
    await tenant.save();
    const domains = await TenantDomain.find({ tenant: tenant._id }).select("hostname").lean();
    refreshStore(String(tenant._id), tenant.slug, domains.flatMap((d) => [d.hostname, `www.${d.hostname}`]));
  }
  return { downgraded: lapsed.length };
}

export async function listInvoices(tenantId: string) {
  const invoices = await Invoice.find({ tenant: tenantId }).sort({ paidAt: -1 }).limit(100).lean();
  return invoices.map((invoice) => ({
    id: String(invoice._id),
    number: invoice.number,
    total: invoice.total,
    periodStart: invoice.periodStart.toISOString(),
    periodEnd: invoice.periodEnd.toISOString(),
    paidAt: invoice.paidAt.toISOString(),
  }));
}
