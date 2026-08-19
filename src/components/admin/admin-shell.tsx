"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, LogOut, Menu, Search, User, X } from "lucide-react";
import { toast } from "sonner";

import { NAV_SECTIONS } from "./nav-config";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils/cn";
import { hasAnyPermission } from "@/lib/permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "./notification-bell";
import type { AdminSession } from "@/types";

export function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => item.permissions.length === 0 || hasAnyPermission(session, item.permissions),
    ),
  })).filter((section) => section.items.length > 0);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiClient.post("/api/admin/auth/logout");
      router.replace("/admin/login");
      router.refresh();
    } catch {
      toast.error("Could not sign you out. Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-white/10 px-4">
          <Link href="/admin" className="flex items-center" aria-label="ManaDeals admin">
            <Image
              src="/logo-compact.png"
              alt="ManaDeals"
              width={1025}
              height={240}
              priority
              className="h-8 w-auto object-contain"
            />
          </Link>
          <button
            className="rounded-md p-1 text-white/70 hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {visibleSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                {section.title}
              </p>
              {section.items.map((item) => {
                const active =
                  item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-[var(--sidebar-active)] font-medium text-white"
                        : "hover:bg-[var(--sidebar-accent)] hover:text-white",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3 text-xs text-white/50">
          ManaDeals Admin · v1.0
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)]/95 px-4 backdrop-blur sm:px-6">
          <button
            className="rounded-md p-2 hover:bg-[var(--muted)] lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>

          <Breadcrumbs pathname={pathname} />

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/admin/products"
              className="hidden rounded-md p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] sm:block"
              aria-label="Search products"
            >
              <Search className="size-4" />
            </Link>

            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--muted)]">
                  <span className="flex size-8 items-center justify-center rounded-full bg-[var(--secondary)] text-xs font-semibold text-white">
                    {session.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block text-sm font-medium leading-4">{session.name}</span>
                    <span className="block text-xs text-[var(--muted-foreground)]">
                      {session.roleName}
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{session.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/profile">
                    <User />
                    My profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={loggingOut}
                  onSelect={(event) => {
                    event.preventDefault();
                    void handleLogout();
                  }}
                >
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean).slice(1); // drop "admin"

  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-sm sm:flex">
      <Link href="/admin" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        Admin
      </Link>
      {segments.map((segment, index) => {
        const href = `/admin/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const label = segment.replace(/-/g, " ").replace(/^\w/, (char) => char.toUpperCase());
        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="size-3.5 text-[var(--muted-foreground)]" />
            {isLast ? (
              <span className="font-medium capitalize">{label}</span>
            ) : (
              <Link
                href={href}
                className="capitalize text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
