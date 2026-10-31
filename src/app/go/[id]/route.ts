import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";

import connectToDatabase from "@/lib/mongodb";
import Product from "@/models/Product";
import Deal from "@/models/Deal";
import Coupon from "@/models/Coupon";
import { recordClick } from "@/services/tracking.service";
import { loadSettings } from "@/services/settings.service";
import { SITE_URL } from "@/lib/seo";
import { clientIp } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { rewriteForTenant, type RewriteResult } from "@/lib/affiliate/rewrite";
import { resolveTenantByHost } from "@/lib/tenant/server";
import { getTenantAffiliate, platformFallbackEnabled } from "@/lib/tenant/affiliate.server";

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
 *
 * White-label stores use the same links on their own host. The store is taken
 * from the Host header (via the proxy), never from a query parameter, so one
 * store's visitors cannot be attributed to, or tagged with, another store.
 */
type TenantCtx = { id: string; origin: string };

/** Rewrites the link with the store's own tags; null on the main site. */
async function rewriteFor(
  tenant: TenantCtx | null,
  input: { url: string; externalProductId?: string },
): Promise<RewriteResult | null> {
  if (!tenant) return null;
  return rewriteForTenant({
    ...input,
    affiliate: await getTenantAffiliate(tenant.id),
    fallbackToPlatform: platformFallbackEnabled(),
  });
}

function tenantFields(tenant: TenantCtx | null, rewrite: RewriteResult | null) {
  return tenant && rewrite ? { tenantId: tenant.id, retailer: rewrite.retailer, tagSource: rewrite.source } : {};
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const type = request.nextUrl.searchParams.get("type") ?? "product";
  const requestedNetwork = request.nextUrl.searchParams.get("n");

  const tenantHost = request.headers.get("x-tenant-host");
  let tenant: TenantCtx | null = null;

  if (tenantHost) {
    const limit = rateLimit(`go:${tenantHost}:${clientIp(request)}`, 60, 60_000);
    if (!limit.allowed) {
      return new NextResponse("Too many requests", {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      });
    }
    const resolved = await resolveTenantByHost(tenantHost).catch(() => null);
    if (!resolved) return NextResponse.redirect(new URL("/", SITE_URL));
    tenant = { id: resolved.id, origin: request.nextUrl.origin };
    if (resolved.status !== "active") return NextResponse.redirect(new URL("/", tenant.origin));
  }

  const home = (path = "/") => new URL(path, tenant?.origin ?? SITE_URL);

  if (!mongoose.isValidObjectId(id)) return NextResponse.redirect(home());

  try {
    await connectToDatabase();
    const settings = await loadSettings();
    const trackingEnabled = settings.affiliate.trackClicks !== false;

    if (type === "deal") return redirectDeal(request, id, trackingEnabled, tenant, home);
    if (type === "coupon") return redirectCoupon(request, id, trackingEnabled, tenant, home);

    // A store's own products are only reachable from that store's host.
    const product = await Product.findOne({ _id: id, status: "active", tenant: tenant ? { $in: [null, tenant.id] } : null })
      .select("category salePrice affiliateLinks")
      .populate({ path: "affiliateLinks.network", select: "affiliateUrlPattern trackingId commissionPercentage status" })
      .lean();

    if (!product || product.affiliateLinks.length === 0) {
      return NextResponse.redirect(home());
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

    if (!link) return NextResponse.redirect(home());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const network = link.network as any;
    const rewrite = await rewriteFor(tenant, { url: link.affiliateUrl, externalProductId: link.externalProductId });
    const destination =
      rewrite && rewrite.source !== "platform"
        ? rewrite.url
        : applyPattern(link.trackingUrl || link.affiliateUrl, network);

    if (trackingEnabled) {
      await recordClick({
        request,
        productId: id,
        categoryId: product.category ? String(product.category) : null,
        networkId: network?._id ? String(network._id) : null,
        salePrice: link.price ?? product.salePrice,
        // Commission rates belong to ManaDeals' networks, so store clicks carry none.
        commissionPercentage: tenant ? 0 : (network?.commissionPercentage ?? 0),
        ...tenantFields(tenant, rewrite),
      }).catch((error) => console.error("[go] click tracking failed", error));
    }

    return redirectOut(destination, home);
  } catch (error) {
    console.error("[go] redirect failed", error);
    return NextResponse.redirect(home());
  }
}

async function redirectDeal(
  request: NextRequest,
  id: string,
  trackingEnabled: boolean,
  tenant: TenantCtx | null,
  home: (path?: string) => URL,
) {
  const deal = await Deal.findOne({ _id: id, status: "active" })
    .select("affiliateUrl product category affiliateNetwork dealPrice")
    .populate({ path: "affiliateNetwork", select: "affiliateUrlPattern trackingId commissionPercentage" })
    .lean();

  if (!deal?.affiliateUrl) return NextResponse.redirect(home("/deals"));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const network = deal.affiliateNetwork as any;
  const rewrite = await rewriteFor(tenant, { url: deal.affiliateUrl });

  if (trackingEnabled) {
    await Promise.all([
      recordClick({
        request,
        dealId: id,
        productId: deal.product ? String(deal.product) : null,
        categoryId: deal.category ? String(deal.category) : null,
        networkId: network?._id ? String(network._id) : null,
        salePrice: deal.dealPrice,
        commissionPercentage: tenant ? 0 : (network?.commissionPercentage ?? 0),
        ...tenantFields(tenant, rewrite),
      }),
      tenant ? Promise.resolve() : Deal.updateOne({ _id: id }, { $inc: { clickCount: 1 } }),
    ]).catch((error) => console.error("[go] deal tracking failed", error));
  }

  return redirectOut(
    rewrite && rewrite.source !== "platform" ? rewrite.url : applyPattern(deal.affiliateUrl, network),
    home,
  );
}

async function redirectCoupon(
  request: NextRequest,
  id: string,
  trackingEnabled: boolean,
  tenant: TenantCtx | null,
  home: (path?: string) => URL,
) {
  const coupon = await Coupon.findOne({ _id: id, status: "active" })
    .select("affiliateUrl affiliateNetwork category")
    .populate({ path: "affiliateNetwork", select: "affiliateUrlPattern trackingId baseUrl commissionPercentage" })
    .lean();

  if (!coupon) return NextResponse.redirect(home("/coupons"));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const network = coupon.affiliateNetwork as any;
  const target = coupon.affiliateUrl || network?.baseUrl;
  if (!target) return NextResponse.redirect(home("/coupons"));

  const rewrite = await rewriteFor(tenant, { url: target });

  if (trackingEnabled) {
    await Promise.all([
      recordClick({
        request,
        couponId: id,
        categoryId: coupon.category ? String(coupon.category) : null,
        networkId: network?._id ? String(network._id) : null,
        ...tenantFields(tenant, rewrite),
      }),
      tenant ? Promise.resolve() : Coupon.updateOne({ _id: id }, { $inc: { usageCount: 1 } }),
    ]).catch((error) => console.error("[go] coupon tracking failed", error));
  }

  return redirectOut(
    rewrite && rewrite.source !== "platform" ? rewrite.url : applyPattern(target, network),
    home,
  );
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
function redirectOut(destination: string, home: (path?: string) => URL) {
  try {
    const url = new URL(destination);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("bad protocol");

    const response = NextResponse.redirect(url.toString(), 302);
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.redirect(home());
  }
}
