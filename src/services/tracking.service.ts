import crypto from "node:crypto";
import type { NextRequest } from "next/server";

import Click from "@/models/Click";
import ProductView from "@/models/ProductView";
import Product from "@/models/Product";
import { clientIp } from "@/lib/api";
import { isBot, normaliseReferrer, parseUserAgent } from "@/lib/utils/user-agent";

/**
 * Visitor IPs are never stored in the clear: they are hashed with the app
 * secret so repeat visits can be recognised without holding personal data.
 */
function hashIp(ip: string) {
  return crypto
    .createHash("sha256")
    .update(`${ip}:${process.env.AUTH_SECRET ?? ""}`)
    .digest("hex")
    .slice(0, 32);
}

function requestContext(request: NextRequest) {
  const userAgent = request.headers.get("user-agent");
  const { device, browser, os } = parseUserAgent(userAgent);

  return {
    userAgent,
    device,
    browser,
    os,
    country: request.headers.get("x-vercel-ip-country") ?? "",
    city: request.headers.get("x-vercel-ip-city") ?? "",
    referrer: normaliseReferrer(request.headers.get("referer"), request.nextUrl.hostname),
    ipHash: hashIp(clientIp(request)),
  };
}

/**
 * Records an outbound affiliate click. Estimated revenue is the network's
 * commission applied to the sale price — a forecast, reconciled later against
 * the partner's own reporting.
 */
export async function recordClick(input: {
  request: NextRequest;
  productId?: string | null;
  dealId?: string | null;
  couponId?: string | null;
  categoryId?: string | null;
  networkId?: string | null;
  salePrice?: number;
  commissionPercentage?: number;
}) {
  const context = requestContext(input.request);
  if (isBot(context.userAgent)) return null;

  const estimatedRevenue =
    input.salePrice && input.commissionPercentage
      ? Math.round((input.salePrice * input.commissionPercentage) / 100)
      : 0;

  const [click] = await Promise.all([
    Click.create({
      product: input.productId ?? null,
      deal: input.dealId ?? null,
      coupon: input.couponId ?? null,
      category: input.categoryId ?? null,
      affiliateNetwork: input.networkId ?? null,
      device: context.device,
      browser: context.browser,
      os: context.os,
      country: context.country,
      city: context.city,
      referrer: context.referrer,
      ipHash: context.ipHash,
      estimatedRevenue,
      clickedAt: new Date(),
    }),
    input.productId
      ? Product.updateOne(
          { _id: input.productId },
          { $inc: { clickCount: 1, popularityScore: 3 } },
        )
      : Promise.resolve(),
  ]);

  return click;
}

/** Records a product page view. Bots are ignored so analytics stay honest. */
export async function recordProductView(input: {
  request: NextRequest;
  productId: string;
  categoryId?: string | null;
}) {
  const context = requestContext(input.request);
  if (isBot(context.userAgent)) return null;

  await Promise.all([
    ProductView.create({
      product: input.productId,
      category: input.categoryId ?? null,
      device: context.device,
      browser: context.browser,
      country: context.country,
      referrer: context.referrer,
      viewedAt: new Date(),
    }),
    Product.updateOne({ _id: input.productId }, { $inc: { viewCount: 1, popularityScore: 1 } }),
  ]);

  return true;
}
