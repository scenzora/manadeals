"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { apiClient, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

type Order = { orderId: string; amount: number; currency: string; keyId: string };
type CheckoutResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, handler: () => void) => void };
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

/** Opens Razorpay Checkout for one Pro term, then verifies the payment on the server. */
export function PayButton({
  label,
  storeName,
  ownerName,
  ownerEmail,
}: {
  label: string;
  storeName: string;
  ownerName: string;
  ownerEmail: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function pay() {
    if (!window.Razorpay) {
      toast.error("Payment window is still loading. Please try again in a moment.");
      return;
    }
    setBusy(true);
    try {
      const order = await apiClient.post<Order>("/api/owner/billing/order");

      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "ManaDeals",
        description: `Pro plan — 12 months (${storeName})`,
        prefill: { name: ownerName, email: ownerEmail },
        theme: { color: "#FF6B00" },
        handler: async (response: CheckoutResponse) => {
          try {
            await apiClient.post("/api/owner/billing/verify", response);
            toast.success("Payment successful. Your Pro plan is active.");
            router.refresh();
          } catch {
            toast.error("Payment received but not confirmed yet. Refresh in a minute; contact support if it persists.");
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.on("payment.failed", () => {
        toast.error("Payment failed. You have not been charged. Please try again.");
        setBusy(false);
      });
      checkout.open();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not start the payment.");
      setBusy(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <Button onClick={pay} loading={busy}>
        {label}
      </Button>
    </>
  );
}
