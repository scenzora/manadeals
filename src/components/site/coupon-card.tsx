"use client";

import { useState } from "react";
import { BadgeCheck, Check, Copy, ExternalLink } from "lucide-react";

import { formatCurrency, formatDate } from "@/lib/utils/format";

export type PublicCoupon = {
  _id: string;
  code: string;
  title: string;
  description: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  minimumOrderValue: number;
  maximumDiscount: number;
  expiryDate: string;
  isVerified: boolean;
  affiliateNetwork?: { name: string; code: string } | null;
};

export function CouponCard({ coupon }: { coupon: PublicCoupon }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied — the code is visible on screen anyway.
    }
  }

  const discount =
    coupon.discountType === "percentage"
      ? `${coupon.discountValue}% OFF`
      : `${formatCurrency(coupon.discountValue)} OFF`;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-[var(--primary)]">{discount}</p>
          <h3 className="line-clamp-2 text-sm font-medium">{coupon.title}</h3>
        </div>
        {coupon.isVerified ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#ecfdf3] px-2 py-0.5 text-xs font-medium text-[var(--success)]">
            <BadgeCheck className="size-3.5" />
            Verified
          </span>
        ) : null}
      </div>

      {coupon.description ? (
        <p className="line-clamp-2 text-xs text-[var(--muted-foreground)]">{coupon.description}</p>
      ) : null}

      <ul className="space-y-0.5 text-xs text-[var(--muted-foreground)]">
        {coupon.minimumOrderValue > 0 ? (
          <li>Min. order {formatCurrency(coupon.minimumOrderValue)}</li>
        ) : null}
        {coupon.maximumDiscount > 0 ? (
          <li>Max. discount {formatCurrency(coupon.maximumDiscount)}</li>
        ) : null}
        <li>Expires {formatDate(coupon.expiryDate)}</li>
      </ul>

      <div className="mt-auto flex items-center gap-2 pt-1">
        <button
          onClick={() => void copyCode()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--primary)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold tracking-wider text-[var(--accent-foreground)] transition-colors hover:bg-[#ffe4d0]"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied!" : coupon.code}
        </button>

        <a
          href={`/go/${coupon._id}?type=coupon`}
          target="_blank"
          rel="nofollow noopener sponsored"
          className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[#e85f00]"
        >
          Shop
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      {coupon.affiliateNetwork?.name ? (
        <p className="text-[11px] text-[var(--muted-foreground)]">at {coupon.affiliateNetwork.name}</p>
      ) : null}
    </article>
  );
}
