import type { Metadata } from "next";
import { DM_Sans, Inter, Lora, Poppins } from "next/font/google";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { getNavigation } from "@/services/storefront.service";
import connectToDatabase from "@/lib/mongodb";
import { SITE_URL } from "@/lib/seo";
import { buildThemeCss, type ThemeFont } from "@/lib/tenant/theme";
import { resolveTenantByHost } from "@/lib/tenant/server";
import { isIndexable } from "@/lib/tenant/seo";

/**
 * Wraps every page of a white-label store. The proxy rewrites the visitor's
 * host into the `[host]` segment, so the real URL never shows `/stores/...`.
 */
const inter = Inter({ subsets: ["latin"], display: "swap", preload: false });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false });
const lora = Lora({ subsets: ["latin"], display: "swap", preload: false });
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", preload: false });

const FONTS: Record<ThemeFont, { className: string }> = { inter, poppins, lora, "dm-sans": dmSans };

type Params = Promise<{ host: string }>;

async function loadTenant(params: Params) {
  const { host } = await params;
  return resolveTenantByHost(decodeURIComponent(host));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const tenant = await loadTenant(params);
  if (!tenant) return {};

  const title = tenant.name;
  const description = tenant.branding.tagline || `Deals and price drops curated by ${tenant.name}.`;
  return {
    metadataBase: new URL(`https://${tenant.primaryHostname}`),
    title: { default: title, template: `%s · ${title}` },
    description,
    icons: tenant.branding.faviconUrl ? { icon: tenant.branding.faviconUrl } : undefined,
    openGraph: { title, description, siteName: title, images: tenant.branding.logoUrl || undefined },
    robots: isIndexable(tenant, "other") ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const tenant = await loadTenant(params);

  // Unknown host: send the visitor to the main site.
  if (!tenant) redirect(SITE_URL);

  if (tenant.status === "suspended") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="text-2xl font-semibold">This store is unavailable</h1>
        <p className="max-w-md text-sm text-[var(--muted-foreground)]">
          {tenant.name} has been suspended. If you own this store, please contact support.
        </p>
      </div>
    );
  }

  await connectToDatabase();
  const categories = await getNavigation();
  const font = FONTS[tenant.theme.fontFamily];

  return (
    <div className={`${font.className} flex min-h-screen flex-col`}>
      {/* Rendered in the first chunk of HTML, so there is no flash of the default theme. */}
      <style dangerouslySetInnerHTML={{ __html: buildThemeCss(tenant.theme) }} />

      <SiteHeader categories={categories} siteName={tenant.name} logo={tenant.branding.logoUrl} textWordmark />

      <main className="flex-1">{children}</main>

      <SiteFooter
        categories={categories}
        siteName={tenant.name}
        tagline={tenant.branding.tagline}
        logo={tenant.branding.logoUrl}
        social={tenant.branding.social}
        contactEmail={tenant.branding.contactEmail}
        disclosure=""
        textWordmark
        // Free stores always show the credit; Pro stores may switch it off. Enforced here, not in the dashboard.
        poweredBy={tenant.plan !== "pro" || tenant.showPoweredBy}
        footerText={tenant.branding.footerText}
      />
    </div>
  );
}
