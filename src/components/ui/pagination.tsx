"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "./button";
import { NativeSelect } from "./input";
import { formatNumber } from "@/lib/utils/format";

export function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[var(--muted-foreground)]">
        Showing <span className="font-medium text-[var(--foreground)]">{formatNumber(from)}</span>–
        <span className="font-medium text-[var(--foreground)]">{formatNumber(to)}</span> of{" "}
        <span className="font-medium text-[var(--foreground)]">{formatNumber(total)}</span>
      </p>

      <div className="flex items-center gap-2">
        {onLimitChange ? (
          <NativeSelect
            className="h-8 w-20 text-xs"
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            aria-label="Rows per page"
          >
            {[10, 20, 50, 100].map((option) => (
              <option key={option} value={option}>
                {option} / page
              </option>
            ))}
          </NativeSelect>
        ) : null}

        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
          Prev
        </Button>
        <span className="px-1 text-xs text-[var(--muted-foreground)]">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
