import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Flame } from "lucide-react";

import { formatCurrency } from "@/lib/utils/format";
import { TimeLeft } from "./time-left";

export type PublicDeal = {
  _id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  dealType: string;
  originalPrice: number;
  dealPrice: number;
  discountPercentage: number;
  couponCode: string;
  endDate: string;
  isFeatured: boolean;
  product?: { slug: string; thumbnail: string; name: string } | null;
  affiliateNetwork?: { name: string; code: string } | null;
};

export function DealCard({ deal }: { deal: PublicDeal }) {
  const image = deal.image || deal.product?.thumbnail;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/9] bg-white">
        {image ? (
          <Image
            src={image}
            alt={deal.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-contain p-3"
            unoptimized
          />
        ) : null}

        {deal.dealType === "flash" ? (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-[var(--warning)] px-2 py-0.5 text-xs font-semibold text-white">
            <Flame className="size-3" />
            Flash
          </span>
        ) : deal.discountPercentage > 0 ? (
          <span className="absolute left-2 top-2 rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-semibold text-white">
            {deal.discountPercentage}% off
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-medium leading-snug">{deal.title}</h3>

        {deal.description ? (
          <p className="line-clamp-2 text-sm text-[var(--muted-foreground)]">{deal.description}</p>
        ) : null}

        {deal.dealPrice > 0 ? (
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold">{formatCurrency(deal.dealPrice)}</span>
            {deal.originalPrice > deal.dealPrice ? (
              <span className="text-sm text-[var(--muted-foreground)] line-through">
                {formatCurrency(deal.originalPrice)}
              </span>
            ) : null}
          </div>
        ) : null}

        {deal.couponCode ? (
          <p className="text-xs">
            Use code{" "}
            <code className="rounded bg-[var(--muted)] px-1.5 py-0.5 font-semibold">
              {deal.couponCode}
            </code>
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <TimeLeft endDate={deal.endDate} />

          {deal.product?.slug ? (
            <Link
              href={`/product/${deal.product.slug}`}
              className="text-sm font-medium text-[var(--primary)] hover:underline"
            >
              View product
            </Link>
          ) : (
            <a
              href={`/go/${deal._id}?type=deal`}
              target="_blank"
              rel="nofollow noopener sponsored"
              className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#e85f00]"
            >
              Grab deal
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>

        {deal.affiliateNetwork?.name ? (
          <p className="text-[11px] text-[var(--muted-foreground)]">at {deal.affiliateNetwork.name}</p>
        ) : null}
      </div>
    </article>
  );
}
