import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";

import connectToDatabase from "@/lib/mongodb";
import Product from "@/models/Product";
import Deal from "@/models/Deal";
import Coupon from "@/models/Coupon";
import { recordClick } from "@/services/tracking.service";
import { loadSettings } from "@/services/settings.service";
import { SITE_URL } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The money path. Every outbound affiliate link on the storefront points here:
 *
 *   /go/<productId>?n=<networkId>     product click
 *   /go/<dealId>?type=deal            deal click
 *   /go/<couponId>?type=coupon        coupon click
 *
 * We record the click, apply the network's URL pattern (so tracking ids live in
 * one place), then redirect. Tracking never blocks the redirect: if the write
 * fails the visitor still reaches the partner.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const type = request.nextUrl.searchParams.get("type") ?? "product";
  const requestedNetwork = request.nextUrl.searchParams.get("n");

  if (!mongoose.isValidObjectId(id)) return NextResponse.redirect(new URL("/", SITE_URL));

  try {
    await connectToDatabase();
    const settings = await loadSettings();
    const trackingEnabled = settings.affiliate.trackClicks !== false;

    if (type === "deal") return redirectDeal(request, id, trackingEnabled);
    if (type === "coupon") return redirectCoupon(request, id, trackingEnabled);

    const product = await Product.findOne({ _id: id, status: "active" })
      .select("category salePrice affiliateLinks")
      .populate({ path: "affiliateLinks.network", select: "affiliateUrlPattern trackingId commissionPercentage status" })
      .lean();

    if (!product || product.affiliateLinks.length === 0) {
      return NextResponse.redirect(new URL("/", SITE_URL));
    }

    // Prefer the requested network, then the primary link, then whatever exists.
    const link =
      (requestedNetwork &&
        product.affiliateLinks.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (entry: any) => String(entry.network?._id ?? entry.network) === requestedNetwork,
        )) ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      product.affiliateLinks.find((entry: any) => entry.isPrimary) ||
      product.affiliateLinks[0];

    if (!link) return NextResponse.redirect(new URL("/", SITE_URL));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const network = link.network as any;
    const destination = applyPattern(link.trackingUrl || link.affiliateUrl, network);

    if (trackingEnabled) {
      await recordClick({
        request,
        productId: id,
        categoryId: product.category ? String(product.category) : null,
        networkId: network?._id ? String(network._id) : null,
        salePrice: link.price ?? product.salePrice,
        commissionPercentage: network?.commissionPercentage ?? 0,
      }).catch((error) => console.error("[go] click tracking failed", error));
    }

    return redirectOut(destination);
  } catch (error) {
    console.error("[go] redirect failed", error);
    return NextResponse.redirect(new URL("/", SITE_URL));
  }
}

async function redirectDeal(request: NextRequest, id: string, trackingEnabled: boolean) {
  const deal = await Deal.findOne({ _id: id, status: "active" })
    .select("affiliateUrl product category affiliateNetwork dealPrice")
    .populate({ path: "affiliateNetwork", select: "affiliateUrlPattern trackingId commissionPercentage" })
    .lean();

  if (!deal?.affiliateUrl) return NextResponse.redirect(new URL("/deals", SITE_URL));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const network = deal.affiliateNetwork as any;

  if (trackingEnabled) {
    await Promise.all([
      recordClick({
        request,
        dealId: id,
        productId: deal.product ? String(deal.product) : null,
        categoryId: deal.category ? String(deal.category) : null,
        networkId: network?._id ? String(network._id) : null,
        salePrice: deal.dealPrice,
        commissionPercentage: network?.commissionPercentage ?? 0,
      }),
      Deal.updateOne({ _id: id }, { $inc: { clickCount: 1 } }),
    ]).catch((error) => console.error("[go] deal tracking failed", error));
  }

  return redirectOut(applyPattern(deal.affiliateUrl, network));
}

async function redirectCoupon(request: NextRequest, id: string, trackingEnabled: boolean) {
  const coupon = await Coupon.findOne({ _id: id, status: "active" })
    .select("affiliateUrl affiliateNetwork category")
    .populate({ path: "affiliateNetwork", select: "affiliateUrlPattern trackingId baseUrl commissionPercentage" })
    .lean();

  if (!coupon) return NextResponse.redirect(new URL("/coupons", SITE_URL));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const network = coupon.affiliateNetwork as any;
  const target = coupon.affiliateUrl || network?.baseUrl;
  if (!target) return NextResponse.redirect(new URL("/coupons", SITE_URL));

  if (trackingEnabled) {
    await Promise.all([
      recordClick({
        request,
        couponId: id,
        categoryId: coupon.category ? String(coupon.category) : null,
        networkId: network?._id ? String(network._id) : null,
      }),
      Coupon.updateOne({ _id: id }, { $inc: { usageCount: 1 } }),
    ]).catch((error) => console.error("[go] coupon tracking failed", error));
  }

  return redirectOut(applyPattern(target, network));
}

/**
 * Substitutes {url} and {trackingId} in the network's pattern. Configuring the
 * tag once on the network means it can be rotated without touching products.
 */
function applyPattern(url: string, network?: { affiliateUrlPattern?: string; trackingId?: string } | null) {
  if (!network?.affiliateUrlPattern || !network.trackingId) return url;
  if (url.includes(network.trackingId)) return url; // already tagged

  return network.affiliateUrlPattern
    .replace("{url}", url)
    .replace("{trackingId}", network.trackingId);
}

/** Only ever redirect to an absolute http(s) URL. */
function redirectOut(destination: string) {
  try {
    const url = new URL(destination);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("bad protocol");

    const response = NextResponse.redirect(url.toString(), 302);
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/", SITE_URL));
  }
}
