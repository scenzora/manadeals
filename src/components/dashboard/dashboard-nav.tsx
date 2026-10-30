"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, CreditCard, FileText, Globe, Home, KeyRound, LogOut, Palette, ShoppingBag } from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils/cn";

const ITEMS = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/branding", label: "Branding", icon: Palette },
  { href: "/dashboard/affiliate", label: "Affiliate IDs", icon: KeyRound },
  { href: "/dashboard/catalog", label: "Products & sections", icon: ShoppingBag },
  { href: "/dashboard/blog", label: "Blog", icon: FileText },
  { href: "/dashboard/domains", label: "Domains", icon: Globe },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/plan", label: "Billing & plan", icon: CreditCard },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Dashboard">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm",
              active ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
      <button
        type="button"
        className="mt-2 flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]"
        onClick={async () => {
          await apiClient.post("/api/owner/auth/logout").catch(() => null);
          router.replace("/dashboard/login");
          router.refresh();
        }}
      >
        <LogOut className="size-4" />
        Sign out
      </button>
    </nav>
  );
}
