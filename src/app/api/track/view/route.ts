import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";

import connectToDatabase from "@/lib/mongodb";
import Product from "@/models/Product";
import { recordProductView } from "@/services/tracking.service";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/api";

export const runtime = "nodejs";

/**
 * Public view beacon, called once per product page from the browser. Doing this
 * client-side rather than during render keeps prefetches, bots and Next.js
 * re-renders out of the analytics.
 */
export async function POST(request: NextRequest) {
  try {
    const { productId } = (await request.json()) as { productId?: string };
    if (!productId || !mongoose.isValidObjectId(productId)) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // One counted view per product per IP per minute.
    const limited = rateLimit(`view:${clientIp(request)}:${productId}`, 1, 60_000);
    if (!limited.allowed) return NextResponse.json({ success: true, counted: false });

    await connectToDatabase();
    const product = await Product.findById(productId).select("category status").lean();
    if (!product || product.status !== "active") {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    await recordProductView({
      request,
      productId,
      categoryId: product.category ? String(product.category) : null,
    });

    return NextResponse.json({ success: true, counted: true });
  } catch (error) {
    console.error("[track] view failed", error);
    // Never surface tracking failures to a visitor.
    return NextResponse.json({ success: false });
  }
}
