"use client";

import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { formatCurrency } from "@/lib/utils/format";
import { PriceHistoryChart } from "@/components/charts/charts";

type HistoryEntry = { currentPrice: number; recordedAt: string };

/**
 * The storefront's differentiator: showing whether today's price is genuinely
 * good rather than just marked down from an inflated MRP.
 */
export function PriceHistoryPanel({
  history,
  currentPrice,
}: {
  history: HistoryEntry[];
  currentPrice: number;
}) {
  const { data, lowest, highest, verdict } = useMemo(() => {
    const points = history.map((entry) => ({
      date: new Date(entry.recordedAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
      price: entry.currentPrice,
    }));

    const prices = history.map((entry) => entry.currentPrice);
    const low = prices.length ? Math.min(...prices) : currentPrice;
    const high = prices.length ? Math.max(...prices) : currentPrice;

    let message = "This is around its usual price.";
    if (currentPrice <= low) message = "This is the lowest price we have recorded.";
    else if (currentPrice >= high) message = "This is the highest price we have recorded.";
    else if (currentPrice < (low + high) / 2) message = "Cheaper than its typical price.";
    else message = "Pricier than its typical price.";

    return { data: points, lowest: low, highest: high, verdict: message };
  }, [history, currentPrice]);

  if (history.length < 2) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="mb-1 font-semibold">Price history</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          We have only just started tracking this product. Check back in a few days for its price
          trend.
        </p>
      </div>
    );
  }

  const goodDeal = currentPrice <= lowest;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Price history</h2>
        <span
          className={
            goodDeal
              ? "flex items-center gap-1.5 rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-medium text-[var(--success)]"
              : "flex items-center gap-1.5 rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)]"
          }
        >
          {goodDeal ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
          {verdict}
        </span>
      </div>

      <PriceHistoryChart data={data} />

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-4 text-center">
        <div>
          <dt className="text-xs text-[var(--muted-foreground)]">Lowest</dt>
          <dd className="font-semibold text-[var(--success)]">{formatCurrency(lowest)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted-foreground)]">Current</dt>
          <dd className="font-semibold">{formatCurrency(currentPrice)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted-foreground)]">Highest</dt>
          <dd className="font-semibold">{formatCurrency(highest)}</dd>
        </div>
      </dl>
    </div>
  );
}
