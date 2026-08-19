"use client";

import { useEffect, useRef } from "react";

/**
 * Fires one view beacon per product page. Client-side on purpose: server
 * renders also happen for prefetches and bots, which would inflate the numbers.
 */
export function ViewTracker({ productId }: { productId: string }) {
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (sent.current === productId) return;
    sent.current = productId;

    const controller = new AbortController();
    fetch("/api/track/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {
      // A failed beacon must never affect the page.
    });

    return () => controller.abort();
  }, [productId]);

  return null;
}
