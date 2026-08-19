import { Wrench } from "lucide-react";

import connectToDatabase from "@/lib/mongodb";
import { loadSettings } from "@/services/settings.service";
import { getNavigation } from "@/services/storefront.service";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const revalidate = 300;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  await connectToDatabase();
  const [settings, categories] = await Promise.all([loadSettings(), getNavigation()]);

  // Maintenance mode is a storefront-only switch: /admin stays reachable so the
  // team can turn it back off.
  if (settings.system.maintenanceMode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
          <Wrench className="size-6" />
        </span>
        <h1 className="text-2xl font-semibold">We will be right back</h1>
        <p className="max-w-md text-sm text-[var(--muted-foreground)]">
          {settings.system.maintenanceMessage ||
            `${settings.general.siteName} is down for scheduled maintenance. Please check back shortly.`}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        categories={categories}
        siteName={settings.general.siteName}
        logo={settings.general.logo}
      />

      <main className="flex-1">{children}</main>

      <SiteFooter
        categories={categories}
        siteName={settings.general.siteName}
        tagline={settings.general.tagline}
        logo={settings.general.logo}
        social={JSON.parse(JSON.stringify(settings.general.social ?? {}))}
        contactEmail={settings.general.contactEmail}
        disclosure={settings.affiliate.disclosureText}
      />
    </div>
  );
}
