"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { PRODUCT_SORTS } from "@/lib/storefront-constants";

type Option = { value: string; label: string };

/**
 * Filters write to the URL rather than to local state, so every filtered view
 * is a real, shareable, server-rendered page.
 */
export function ProductFilters({
  brands,
  networks,
  showCategoryNote,
}: {
  brands: Option[];
  networks: Option[];
  showCategoryNote?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [minPrice, setMinPrice] = useState(searchParams.get("min") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max") ?? "");

  function apply(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page"); // any filter change resets pagination
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const activeCount = ["brand", "network", "min", "max", "discount"].filter((key) =>
    searchParams.get(key),
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium lg:hidden"
        >
          <SlidersHorizontal className="size-4" />
          Filters
          {activeCount > 0 ? (
            <span className="rounded-full bg-[var(--primary)] px-1.5 text-xs text-white">
              {activeCount}
            </span>
          ) : null}
        </button>

        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="hidden text-[var(--muted-foreground)] sm:inline">Sort by</span>
          <select
            value={searchParams.get("sort") ?? "popular"}
            onChange={(event) => apply({ sort: event.target.value })}
            disabled={pending}
            className="h-9 rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {PRODUCT_SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className={cn(
          "space-y-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4",
          open ? "block" : "hidden lg:block",
        )}
      >
        {showCategoryNote ? (
          <p className="text-xs text-[var(--muted-foreground)]">{showCategoryNote}</p>
        ) : null}

        <FilterGroup label="Brand">
          <select
            value={searchParams.get("brand") ?? ""}
            onChange={(event) => apply({ brand: event.target.value })}
            className="h-9 w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-2 text-sm"
          >
            <option value="">All brands</option>
            {brands.map((brand) => (
              <option key={brand.value} value={brand.value}>
                {brand.label}
              </option>
            ))}
          </select>
        </FilterGroup>

        <FilterGroup label="Store">
          <select
            value={searchParams.get("network") ?? ""}
            onChange={(event) => apply({ network: event.target.value })}
            className="h-9 w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-2 text-sm"
          >
            <option value="">All stores</option>
            {networks.map((network) => (
              <option key={network.value} value={network.value}>
                {network.label}
              </option>
            ))}
          </select>
        </FilterGroup>

        <FilterGroup label="Price">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder="Min"
              aria-label="Minimum price"
              className="h-9 w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-2 text-sm"
            />
            <span className="text-[var(--muted-foreground)]">–</span>
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="Max"
              aria-label="Maximum price"
              className="h-9 w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-2 text-sm"
            />
          </div>
          <button
            onClick={() => apply({ min: minPrice, max: maxPrice })}
            disabled={pending}
            className="mt-2 w-full rounded-lg bg-[var(--secondary)] px-3 py-1.5 text-sm font-medium text-white"
          >
            Apply price
          </button>
        </FilterGroup>

        <FilterGroup label="Discount">
          <div className="flex flex-wrap gap-1.5">
            {[10, 25, 40, 60].map((value) => {
              const active = searchParams.get("discount") === String(value);
              return (
                <button
                  key={value}
                  onClick={() => apply({ discount: active ? undefined : String(value) })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs",
                    active
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--border)] hover:bg-[var(--muted)]",
                  )}
                >
                  {value}%+
                </button>
              );
            })}
          </div>
        </FilterGroup>

        {activeCount > 0 ? (
          <button
            onClick={() => {
              setMinPrice("");
              setMaxPrice("");
              apply({ brand: undefined, network: undefined, min: undefined, max: undefined, discount: undefined });
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
          >
            <X className="size-3.5" />
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </p>
      {children}
    </div>
  );
}
