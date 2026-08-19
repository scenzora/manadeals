import Image from "next/image";
import Link from "next/link";
import type { NavCategory } from "./site-header";

/**
 * Brand marks as inline SVG paths. Icon libraries dropped brand icons for
 * trademark reasons, and this avoids adding a dependency for five glyphs.
 */
const SOCIAL_PATHS: Record<string, string> = {
  facebook:
    "M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z",
  instagram:
    "M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85C2.38 3.92 3.89 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zM12 16a4 4 0 110-8 4 4 0 010 8zm6.41-11.85a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z",
  twitter:
    "M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.59l5.24 6.93zm-1.29 19.5h2.04L6.49 3.24H4.3z",
  youtube:
    "M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 00.5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 002.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 002.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.81zM9.55 15.57V8.43L15.82 12z",
  telegram:
    "M23.91 3.79L20.3 20.84c-.25 1.21-.98 1.5-2 .94l-5.5-4.07-2.66 2.57c-.3.3-.55.56-1.1.56-.72 0-.6-.27-.84-.95L6.3 13.7l-5.45-1.7c-1.18-.35-1.19-1.16.26-1.75l21.26-8.2c.97-.43 1.9.24 1.54 1.73z",
  whatsapp:
    "M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 01-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 01-1.51-5.26c0-5.45 4.44-9.89 9.9-9.89a9.82 9.82 0 016.99 2.9 9.82 9.82 0 012.89 6.99c0 5.45-4.44 9.89-9.89 9.89M20.52 3.45A11.8 11.8 0 0012.05 0C5.5 0 .17 5.33.17 11.88c0 2.09.55 4.14 1.59 5.94L.07 24l6.33-1.66a11.87 11.87 0 005.65 1.44h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.24-6.16-3.48-8.4",
};

function SocialIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-4">
      <path d={path} />
    </svg>
  );
}

export function SiteFooter({
  categories,
  siteName,
  tagline,
  logo,
  social,
  contactEmail,
  disclosure,
}: {
  categories: NavCategory[];
  siteName: string;
  tagline: string;
  logo: string;
  social: Record<string, string>;
  contactEmail: string;
  disclosure: string;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-[var(--secondary)] text-white/80">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <Image
              src={logo || "/logo.png"}
              alt={siteName}
              width={1025}
              height={240}
              className="h-10 w-auto object-contain"
            />
            <p className="max-w-xs text-sm">
              {tagline || "Handpicked deals and price drops from Amazon, Flipkart and more."}
            </p>

            <div className="flex gap-2 pt-1">
              {Object.entries(SOCIAL_PATHS).map(([key, path]) => {
                const href = social?.[key];
                if (!href) return null;
                return (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={key}
                    className="rounded-lg bg-white/10 p-2 transition-colors hover:bg-[var(--primary)] hover:text-white"
                  >
                    <SocialIcon path={path} />
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/products" className="hover:text-[var(--primary)]">
                  All products
                </Link>
              </li>
              <li>
                <Link href="/deals" className="hover:text-[var(--primary)]">
                  Today&apos;s deals
                </Link>
              </li>
              <li>
                <Link href="/coupons" className="hover:text-[var(--primary)]">
                  Coupons
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-[var(--primary)]">
                  Buying guides
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Categories</h3>
            <ul className="space-y-2 text-sm">
              {categories.slice(0, 6).map((category) => (
                <li key={category._id}>
                  <Link href={`/category/${category.slug}`} className="hover:text-[var(--primary)]">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Company</h3>
            <ul className="space-y-2 text-sm">
              {contactEmail ? (
                <li>
                  <a href={`mailto:${contactEmail}`} className="hover:text-[var(--primary)]">
                    {contactEmail}
                  </a>
                </li>
              ) : null}
              <li>
                <Link href="/blog" className="hover:text-[var(--primary)]">
                  Blog
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Affiliate disclosure is a legal requirement for this business model. */}
        <div className="mt-10 space-y-3 border-t border-white/10 pt-6 text-xs">
          <p className="max-w-4xl">
            {disclosure ||
              `${siteName} is a deals and price-comparison site. We may earn a commission when you buy through links on this site, at no extra cost to you. Prices and availability are accurate as of the time shown and can change on the retailer's site.`}
          </p>
          <p className="text-white/50">
            © {year} {siteName}. All product names, logos and brands are property of their respective
            owners.
          </p>
        </div>
      </div>
    </footer>
  );
}
