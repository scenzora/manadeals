import { z } from "zod";

import { ApiException, ok, readJson } from "@/lib/api";
import { verifyCheckoutSignature } from "@/lib/billing";
import { ownerRoute, tenantIdOf } from "@/lib/owner-api";
import { fulfilOrder, razorpayKeys } from "@/services/billing.service";
import { BillingOrder } from "@/models/Invoice";

export const runtime = "nodejs";

const schema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

/** Called by the browser after checkout succeeds; the signature proves Razorpay took the payment. */
export const POST = ownerRoute(async (request, { owner }) => {
  const input = schema.parse(await readJson(request));
  const { keySecret } = razorpayKeys();

  const order = await BillingOrder.findOne({
    razorpayOrderId: input.razorpay_order_id,
    tenant: tenantIdOf(owner),
  }).lean();
  if (!order) throw new ApiException("Order not found", 404);

  if (!verifyCheckoutSignature(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature, keySecret)) {
    throw new ApiException("Payment could not be verified", 400);
  }

  const result = await fulfilOrder(input.razorpay_order_id, input.razorpay_payment_id);
  return ok({ alreadyProcessed: result.alreadyProcessed });
});
