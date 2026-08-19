import Image from "next/image";
import Link from "next/link";
import { ImageOff, Star } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatCompact } from "@/lib/utils/format";
import type { PublicProduct } from "@/services/storefront.service";

export function ProductCard({ product, className }: { product: PublicProduct; className?: string }) {
  const outOfStock = product.availability === "out-of-stock";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] transition-shadow hover:shadow-md",
        className,
      )}
    >
      <Link href={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-white">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <ImageOff className="absolute inset-0 m-auto size-8 text-[var(--muted-foreground)]" />
        )}

        {product.discountPercentage > 0 ? (
          <span className="absolute left-2 top-2 rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-semibold text-white">
            {product.discountPercentage}% off
          </span>
        ) : null}

        {outOfStock ? (
          <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-xs font-medium text-white">
            Out of stock
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {product.brand?.name ? (
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            {product.brand.name}
          </p>
        ) : null}

        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-2 text-sm font-medium leading-snug hover:text-[var(--primary)]"
        >
          {product.name}
        </Link>

        {product.rating > 0 ? (
          <p className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
            <span className="flex items-center gap-0.5 rounded bg-[#ecfdf3] px-1.5 py-0.5 font-semibold text-[var(--success)]">
              {product.rating.toFixed(1)}
              <Star className="size-3 fill-current" />
            </span>
            ({formatCompact(product.reviewCount)})
          </p>
        ) : null}

        <div className="mt-auto space-y-1 pt-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-base font-semibold">{formatCurrency(product.salePrice)}</span>
            {product.originalPrice > product.salePrice ? (
              <span className="text-xs text-[var(--muted-foreground)] line-through">
                {formatCurrency(product.originalPrice)}
              </span>
            ) : null}
          </div>

          {product.networks.length > 0 ? (
            <p className="truncate text-[11px] text-[var(--muted-foreground)]">
              at {product.networks.map((network) => network.name).join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: PublicProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
