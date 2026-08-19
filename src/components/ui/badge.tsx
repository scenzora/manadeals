import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--accent)] text-[var(--accent-foreground)]",
        neutral: "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]",
        success: "border-transparent bg-[#ecfdf3] text-[var(--success)]",
        warning: "border-transparent bg-[#fffaeb] text-[var(--warning)]",
        danger: "border-transparent bg-[#fef3f2] text-[var(--destructive)]",
        info: "border-transparent bg-[#eff8ff] text-[var(--info)]",
        navy: "border-transparent bg-[#e3ecf5] text-[var(--secondary)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  active: "success",
  published: "success",
  approved: "success",
  inactive: "neutral",
  draft: "neutral",
  archived: "neutral",
  pending: "warning",
  scheduled: "info",
  expired: "danger",
  blocked: "danger",
  rejected: "danger",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "neutral"} className="capitalize">
      {status.replace(/-/g, " ")}
    </Badge>
  );
}
