import crypto from "node:crypto";

/** Pro is sold as one 12-month term. Amounts are in paise (₹1 = 100). */
export const PRO_TERM_MONTHS = 12;
export const PRO_LIST_PRICE_PAISE = 1_200_000;
export const PRO_PRICE_PAISE = Number(process.env.BILLING_PRO_PRICE_PAISE) || 99_900;
/** Days a lapsed Pro store keeps its features while the owner renews. */
export const GRACE_DAYS = 7;
/** The dashboard starts nagging this many days before expiry. */
export const REMINDER_DAYS = 14;

const DAY_MS = 86_400_000;

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  const day = next.getUTCDate();
  next.setUTCMonth(next.getUTCMonth() + months, 1);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

/**
 * A new term starts when the old one ends, so renewing early never wastes paid
 * days; a lapsed (or first-time) purchase starts now.
 */
export function nextTerm(currentExpiry: Date | null | undefined, now = new Date()) {
  const start = currentExpiry && currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
  return { start, end: addMonths(start, PRO_TERM_MONTHS) };
}

export type SubscriptionState = "free" | "active" | "expiring" | "grace" | "expired" | "manual";

/** `manual` = Pro granted by an admin with no end date, which never lapses. */
export function subscriptionState(plan: string, expiresAt: Date | null | undefined, now = new Date()) {
  if (plan !== "pro") return { state: "free" as SubscriptionState, daysLeft: 0 };
  if (!expiresAt) return { state: "manual" as SubscriptionState, daysLeft: Infinity };
  const msLeft = expiresAt.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / DAY_MS);
  if (msLeft > REMINDER_DAYS * DAY_MS) return { state: "active" as SubscriptionState, daysLeft };
  if (msLeft > 0) return { state: "expiring" as SubscriptionState, daysLeft };
  if (-msLeft <= GRACE_DAYS * DAY_MS) return { state: "grace" as SubscriptionState, daysLeft };
  return { state: "expired" as SubscriptionState, daysLeft };
}

/** The price is tax-inclusive; GST (if configured) is split out for the invoice. */
export function splitTax(totalPaise: number, gstRatePercent: number) {
  if (!gstRatePercent) return { subtotal: totalPaise, tax: 0, total: totalPaise };
  const subtotal = Math.round(totalPaise / (1 + gstRatePercent / 100));
  return { subtotal, tax: totalPaise - subtotal, total: totalPaise };
}

export const gstRate = () => Number(process.env.BILLING_GST_RATE) || 0;

export function formatInvoiceNumber(year: number, sequence: number) {
  return `MD-${year}-${String(sequence).padStart(5, "0")}`;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

const hmac = (secret: string, payload: string) => crypto.createHmac("sha256", secret).update(payload).digest("hex");

/** Checkout returns `signature = HMAC_SHA256(orderId|paymentId, key_secret)`. */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  if (!secret || !signature) return false;
  return safeEqual(hmac(secret, `${orderId}|${paymentId}`), signature);
}

/** Webhooks sign the raw request body with the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  if (!secret || !signature) return false;
  return safeEqual(hmac(secret, rawBody), signature);
}
