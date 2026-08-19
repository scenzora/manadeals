import Deal from "@/models/Deal";
import Coupon from "@/models/Coupon";

/**
 * Marks deals and coupons whose end date has passed as expired. Called lazily
 * whenever the lists are read, so no scheduler is required; a cron job can call
 * the same function later without any change.
 */
export async function expireStaleOffers() {
  const now = new Date();

  const [deals, coupons] = await Promise.all([
    Deal.updateMany(
      { status: "active", endDate: { $lt: now } },
      { $set: { status: "expired" } },
    ),
    Coupon.updateMany(
      { status: "active", expiryDate: { $lt: now } },
      { $set: { status: "expired" } },
    ),
  ]);

  return { deals: deals.modifiedCount, coupons: coupons.modifiedCount };
}
