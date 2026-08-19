import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  change,
  icon: Icon,
  hint,
  accent = "primary",
}: {
  label: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  hint?: string;
  accent?: "primary" | "navy" | "success" | "info";
}) {
  const accentClass = {
    primary: "bg-[var(--accent)] text-[var(--accent-foreground)]",
    navy: "bg-[#e3ecf5] text-[var(--secondary)]",
    success: "bg-[#ecfdf3] text-[var(--success)]",
    info: "bg-[#eff8ff] text-[var(--info)]",
  }[accent];

  const positive = (change ?? 0) >= 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            {label}
          </p>
          <p className="truncate text-2xl font-semibold tracking-tight">{value}</p>
          {change !== undefined ? (
            <p
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                positive ? "text-[var(--success)]" : "text-[var(--destructive)]",
              )}
            >
              {positive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {Math.abs(change)}%
              <span className="font-normal text-[var(--muted-foreground)]">vs previous period</span>
            </p>
          ) : hint ? (
            <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>
          ) : null}
        </div>
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", accentClass)}>
          <Icon className="size-5" />
        </span>
      </div>
    </Card>
  );
}
