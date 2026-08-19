"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Flame, Menu, Search, Tag, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type NavCategory = {
  _id: string;
  name: string;
  slug: string;
  children: { _id: string; name: string; slug: string }[];
};

export function SiteHeader({
  categories,
  siteName,
  logo,
}: {
  categories: NavCategory[];
  siteName: string;
  logo: string;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  // Deliberately not seeded from useSearchParams: that would opt every page out
  // of static rendering, and the header appears on all of them.
  const [query, setQuery] = useState("");

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const term = query.trim();
    router.push(term ? `/products?q=${encodeURIComponent(term)}` : "/products");
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <button
          className="rounded-md p-2 hover:bg-[var(--muted)] lg:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image
            src={logo || "/logo.png"}
            alt={siteName}
            width={36}
            height={36}
            className="size-9 rounded-lg object-contain"
          />
          <span className="text-lg font-semibold tracking-tight">
            Mana<span className="text-[var(--primary)]">Deals</span>
          </span>
        </Link>

        <form onSubmit={submitSearch} className="relative ml-2 hidden flex-1 md:block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for products, brands and deals…"
            aria-label="Search products"
            className="h-10 w-full rounded-full border border-[var(--input)] bg-[var(--background)] pl-9 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </form>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          <HeaderLink href="/deals" icon={<Flame className="size-4" />}>
            Deals
          </HeaderLink>
          <HeaderLink href="/coupons" icon={<Tag className="size-4" />}>
            Coupons
          </HeaderLink>
          <HeaderLink href="/blog">Blog</HeaderLink>
        </nav>
      </div>

      {/* Category bar */}
      <div className="hidden border-t border-[var(--border)] lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 sm:px-6">
          <Link
            href="/products"
            className="whitespace-nowrap px-3 py-2.5 text-sm font-medium hover:text-[var(--primary)]"
          >
            All products
          </Link>
          {categories.map((category) => (
            <div key={category._id} className="group relative">
              <Link
                href={`/category/${category.slug}`}
                className="flex items-center gap-1 whitespace-nowrap px-3 py-2.5 text-sm hover:text-[var(--primary)]"
              >
                {category.name}
                {category.children.length > 0 ? <ChevronDown className="size-3.5" /> : null}
              </Link>

              {category.children.length > 0 ? (
                <div className="invisible absolute left-0 top-full z-50 min-w-48 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1.5 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                  {category.children.map((child) => (
                    <Link
                      key={child._id}
                      href={`/category/${child.slug}`}
                      className="block rounded-md px-3 py-2 text-sm hover:bg-[var(--muted)]"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="border-t border-[var(--border)] bg-[var(--card)] lg:hidden">
          <div className="space-y-3 px-4 py-4">
            <form onSubmit={submitSearch} className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search…"
                aria-label="Search products"
                className="h-10 w-full rounded-full border border-[var(--input)] bg-[var(--background)] pl-9 pr-4 text-sm"
              />
            </form>

            <div className="flex gap-2">
              <Link
                href="/deals"
                onClick={() => setMenuOpen(false)}
                className="flex-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-center text-sm font-medium text-white"
              >
                Deals
              </Link>
              <Link
                href="/coupons"
                onClick={() => setMenuOpen(false)}
                className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-center text-sm font-medium"
              >
                Coupons
              </Link>
              <Link
                href="/blog"
                onClick={() => setMenuOpen(false)}
                className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-center text-sm font-medium"
              >
                Blog
              </Link>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {categories.map((category) => (
                <div key={category._id} className="py-1">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/category/${category.slug}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex-1 py-2 text-sm font-medium"
                    >
                      {category.name}
                    </Link>
                    {category.children.length > 0 ? (
                      <button
                        onClick={() =>
                          setOpenCategory((current) => (current === category._id ? null : category._id))
                        }
                        aria-label={`Toggle ${category.name}`}
                        className="p-2"
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            openCategory === category._id && "rotate-180",
                          )}
                        />
                      </button>
                    ) : null}
                  </div>

                  {openCategory === category._id ? (
                    <div className="pb-2 pl-3">
                      {category.children.map((child) => (
                        <Link
                          key={child._id}
                          href={`/category/${child.slug}`}
                          onClick={() => setMenuOpen(false)}
                          className="block py-1.5 text-sm text-[var(--muted-foreground)]"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function HeaderLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--muted)]"
    >
      {icon}
      {children}
    </Link>
  );
}
