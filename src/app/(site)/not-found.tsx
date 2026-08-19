import Link from "next/link";
import { SearchX } from "lucide-react";

import { Section } from "@/components/site/ui";

export default function SiteNotFound() {
  return (
    <Section className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
        <SearchX className="size-6" />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">We could not find that page</h1>
      <p className="mt-2 max-w-md text-sm text-[var(--muted-foreground)]">
        The product may have been delisted, or the link might be out of date. Plenty of live deals are
        still waiting for you.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/deals"
          className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#e85f00]"
        >
          Today&apos;s deals
        </Link>
        <Link
          href="/products"
          className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium hover:bg-[var(--muted)]"
        >
          Browse products
        </Link>
      </div>
    </Section>
  );
}
