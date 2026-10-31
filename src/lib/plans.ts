export type Plan = "free" | "pro";

/** What each plan allows. Enforced server-side wherever the limit applies. */
export const PLAN_LIMITS: Record<
  Plan,
  { homeSections: number; blogPosts: number; ownProducts: number; customDomain: boolean; removeBadge: boolean; fullAnalytics: boolean }
> = {
  free: { homeSections: 4, blogPosts: 5, ownProducts: 12, customDomain: false, removeBadge: false, fullAnalytics: false },
  pro: { homeSections: 20, blogPosts: 500, ownProducts: 1000, customDomain: true, removeBadge: true, fullAnalytics: true },
};

export const limitsFor = (plan: string) => PLAN_LIMITS[plan === "pro" ? "pro" : "free"];

/**
 * Payment seam. Razorpay (or any provider) plugs in here: `startCheckout`
 * returns a hosted-checkout URL and the webhook handler calls `setPlan`.
 * TODO(billing): implement with Razorpay Subscriptions; until then upgrades are
 * done by an admin from the platform admin panel.
 */
export interface BillingProvider {
  startCheckout(input: { tenantId: string; plan: Plan; returnUrl: string }): Promise<{ checkoutUrl: string }>;
  cancel(input: { tenantId: string }): Promise<void>;
}

export const billingProvider: BillingProvider | null = null;
