import { NextResponse, type NextRequest } from "next/server";

import connectToDatabase from "@/lib/mongodb";
import { verifyWebhookSignature } from "@/lib/billing";
import { fulfilOrder } from "@/services/billing.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Razorpay webhook (events: payment.captured, order.paid). It is the safety net
 * for customers who pay and then close the tab before the verify call lands.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, request.headers.get("x-razorpay-signature") ?? "", secret)) {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
  };
  const payment = event.payload?.payment?.entity;
  if (!["payment.captured", "order.paid"].includes(event.event) || !payment?.id || !payment.order_id) {
    return NextResponse.json({ received: true });
  }

  try {
    await connectToDatabase();
    await fulfilOrder(payment.order_id, payment.id);
  } catch (error) {
    // Unknown orders are not ours; anything else is retried by Razorpay.
    const status = (error as { status?: number }).status;
    if (status !== 404) return new NextResponse("Retry", { status: 500 });
  }
  return NextResponse.json({ received: true });
}
