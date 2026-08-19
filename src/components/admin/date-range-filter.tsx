"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarDays } from "lucide-react";

import { DATE_PRESETS } from "@/lib/date-range";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DateRangePreset } from "@/types";

/** Writes the selected range into the URL so server components can read it. */
export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const active = (searchParams.get("preset") as DateRangePreset) || "last-7-days";
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  function apply(preset: DateRangePreset, customFrom?: string, customTo?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("preset", preset);
    if (preset === "custom" && customFrom && customTo) {
      params.set("from", customFrom);
      params.set("to", customTo);
    } else {
      params.delete("from");
      params.delete("to");
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1">
        <CalendarDays className="ml-1.5 size-4 text-[var(--muted-foreground)]" />
        {DATE_PRESETS.filter((preset) => preset.value !== "custom").map((preset) => (
          <button
            key={preset.value}
            onClick={() => apply(preset.value)}
            disabled={pending}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              active === preset.value
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className="h-9 w-36 text-xs"
          aria-label="From date"
        />
        <span className="text-xs text-[var(--muted-foreground)]">to</span>
        <Input
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          className="h-9 w-36 text-xs"
          aria-label="To date"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!from || !to || pending}
          onClick={() => apply("custom", from, to)}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
