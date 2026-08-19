import Link from "next/link";
import { ArrowRight, PackageOpen } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/** Section heading with an optional "view all" link, used across the storefront. */
export function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel = "View all",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
        {subtitle ? <p className="text-sm text-[var(--muted-foreground)]">{subtitle}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
        >
          {linkLabel}
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

export function Section({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn("mx-auto max-w-7xl px-4 py-8 sm:px-6", className)} {...props} />;
}

export function SiteEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-16 text-center">
      <PackageOpen className="size-8 text-[var(--muted-foreground)]" />
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        {description ? (
          <p className="max-w-md text-sm text-[var(--muted-foreground)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** Link-based pagination — keeps listing pages server-rendered and crawlable. */
export function SitePagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const windowStart = Math.max(1, Math.min(page - 2, totalPages - 4));
  const windowEnd = Math.min(totalPages, windowStart + 4);
  const pages = Array.from({ length: windowEnd - windowStart + 1 }, (_, index) => windowStart + index);

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--muted)]">
          Previous
        </Link>
      ) : null}

      {pages.map((entry) => (
        <Link
          key={entry}
          href={buildHref(entry)}
          aria-current={entry === page ? "page" : undefined}
          className={cn(
            "min-w-10 rounded-lg border px-3 py-2 text-center text-sm",
            entry === page
              ? "border-[var(--primary)] bg-[var(--primary)] font-medium text-white"
              : "border-[var(--border)] hover:bg-[var(--muted)]",
          )}
        >
          {entry}
        </Link>
      ))}

      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--muted)]">
          Next
        </Link>
      ) : null}
    </nav>
  );
}

export function Breadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
      {items.map((item, index) => (
        <span key={`${item.name}-${index}`} className="flex items-center gap-1.5">
          {index > 0 ? <span aria-hidden>/</span> : null}
          {item.href ? (
            <Link href={item.href} className="hover:text-[var(--foreground)]">
              {item.name}
            </Link>
          ) : (
            <span className="text-[var(--foreground)]">{item.name}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
