"use client";

import { useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, ToggleRow } from "@/components/ui/form-field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Settings = {
  general: {
    siteName: string;
    tagline: string;
    logo: string;
    favicon: string;
    contactEmail: string;
    supportPhone: string;
    address: string;
    social: Record<string, string>;
  };
  affiliate: {
    defaultNetwork: string;
    redirectDelaySeconds: number;
    openInNewTab: boolean;
    nofollow: boolean;
    disclosureText: string;
    trackClicks: boolean;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImage: string;
    twitterHandle: string;
    twitterCard: string;
    canonicalUrl: string;
    robots: string;
    sitemapEnabled: boolean;
    googleAnalyticsId: string;
    googleSiteVerification: string;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    fromName: string;
    fromEmail: string;
    secure: boolean;
  };
  system: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    cacheEnabled: boolean;
    cacheTtlSeconds: number;
    paginationSize: number;
  };
};

const SOCIAL_KEYS = ["facebook", "instagram", "twitter", "youtube", "telegram", "whatsapp"] as const;

export function SettingsClient({
  settings: initial,
  canManage,
}: {
  settings: Settings;
  canManage: boolean;
}) {
  const [settings, setSettings] = useState<Settings>(initial);
  const [smtpPassword, setSmtpPassword] = useState("");
  const [saving, setSaving] = useState(false);

  /** Shallow-merges a patch into one settings section. */
  function update<K extends keyof Settings>(section: K, patch: Partial<Settings[K]>) {
    setSettings((previous) => ({ ...previous, [section]: { ...previous[section], ...patch } }));
  }

  async function save(section: keyof Settings) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { [section]: settings[section] };
      if (section === "email" && smtpPassword) {
        payload.email = { ...settings.email, smtpPassword };
      }
      await apiClient.put("/api/admin/settings", payload);
      toast.success("Settings saved");
      setSmtpPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Global configuration for the storefront, affiliate behaviour and this admin panel."
      />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="affiliate">Affiliate</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Site identity</CardTitle>
              <CardDescription>Shown across the storefront and in transactional email.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Website name" htmlFor="siteName">
                <Input
                  id="siteName"
                  value={settings.general.siteName}
                  onChange={(event) => update("general", { siteName: event.target.value })}
                  disabled={!canManage}
                />
              </Field>
              <Field label="Tagline" htmlFor="tagline">
                <Input
                  id="tagline"
                  value={settings.general.tagline}
                  onChange={(event) => update("general", { tagline: event.target.value })}
                  disabled={!canManage}
                />
              </Field>
              <Field label="Logo URL" htmlFor="logo">
                <Input
                  id="logo"
                  value={settings.general.logo}
                  onChange={(event) => update("general", { logo: event.target.value })}
                  disabled={!canManage}
                />
              </Field>
              <Field label="Favicon URL" htmlFor="favicon">
                <Input
                  id="favicon"
                  value={settings.general.favicon}
                  onChange={(event) => update("general", { favicon: event.target.value })}
                  disabled={!canManage}
                />
              </Field>
              <Field label="Contact email" htmlFor="contactEmail">
                <Input
                  id="contactEmail"
                  type="email"
                  value={settings.general.contactEmail}
                  onChange={(event) => update("general", { contactEmail: event.target.value })}
                  disabled={!canManage}
                />
              </Field>
              <Field label="Support phone" htmlFor="supportPhone">
                <Input
                  id="supportPhone"
                  value={settings.general.supportPhone}
                  onChange={(event) => update("general", { supportPhone: event.target.value })}
                  disabled={!canManage}
                />
              </Field>

              <div className="sm:col-span-2">
                <p className="mb-2 text-sm font-medium">Social links</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SOCIAL_KEYS.map((key) => (
                    <Field key={key} label={key[0]!.toUpperCase() + key.slice(1)} htmlFor={`social-${key}`}>
                      <Input
                        id={`social-${key}`}
                        placeholder="https://"
                        value={settings.general.social?.[key] ?? ""}
                        onChange={(event) =>
                          update("general", {
                            social: { ...settings.general.social, [key]: event.target.value },
                          })
                        }
                        disabled={!canManage}
                      />
                    </Field>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2 flex justify-end">
                {canManage ? (
                  <Button loading={saving} onClick={() => void save("general")}>
                    Save changes
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="affiliate">
          <Card>
            <CardHeader>
              <CardTitle>Affiliate behaviour</CardTitle>
              <CardDescription>How outbound links behave and whether clicks are tracked.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Default network code" htmlFor="defaultNetwork" hint="e.g. amazon">
                  <Input
                    id="defaultNetwork"
                    value={settings.affiliate.defaultNetwork}
                    onChange={(event) => update("affiliate", { defaultNetwork: event.target.value })}
                    disabled={!canManage}
                  />
                </Field>
                <Field label="Redirect delay (seconds)" htmlFor="redirectDelay">
                  <Input
                    id="redirectDelay"
                    type="number"
                    min={0}
                    max={30}
                    value={settings.affiliate.redirectDelaySeconds}
                    onChange={(event) =>
                      update("affiliate", { redirectDelaySeconds: Number(event.target.value) })
                    }
                    disabled={!canManage}
                  />
                </Field>
              </div>

              <Field label="Affiliate disclosure text" htmlFor="disclosure">
                <Textarea
                  id="disclosure"
                  rows={2}
                  value={settings.affiliate.disclosureText}
                  onChange={(event) => update("affiliate", { disclosureText: event.target.value })}
                  disabled={!canManage}
                />
              </Field>

              <ToggleRow
                label="Open links in a new tab"
                checked={settings.affiliate.openInNewTab}
                onCheckedChange={(value) => update("affiliate", { openInNewTab: value })}
              />
              <ToggleRow
                label="Add rel=nofollow"
                description="Recommended for affiliate links"
                checked={settings.affiliate.nofollow}
                onCheckedChange={(value) => update("affiliate", { nofollow: value })}
              />
              <ToggleRow
                label="Track outbound clicks"
                description="Powers the analytics module"
                checked={settings.affiliate.trackClicks}
                onCheckedChange={(value) => update("affiliate", { trackClicks: value })}
              />

              <div className="flex justify-end">
                {canManage ? (
                  <Button loading={saving} onClick={() => void save("affiliate")}>
                    Save changes
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>SMTP</CardTitle>
              <CardDescription>
                Used for password resets and, later, price-drop alerts. The password is stored
                server-side and never returned.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="SMTP host" htmlFor="smtpHost">
                <Input
                  id="smtpHost"
                  value={settings.email.smtpHost}
                  onChange={(event) => update("email", { smtpHost: event.target.value })}
                  disabled={!canManage}
                />
              </Field>
              <Field label="SMTP port" htmlFor="smtpPort">
                <Input
                  id="smtpPort"
                  type="number"
                  value={settings.email.smtpPort}
                  onChange={(event) => update("email", { smtpPort: Number(event.target.value) })}
                  disabled={!canManage}
                />
              </Field>
              <Field label="SMTP user" htmlFor="smtpUser">
                <Input
                  id="smtpUser"
                  value={settings.email.smtpUser}
                  onChange={(event) => update("email", { smtpUser: event.target.value })}
                  disabled={!canManage}
                />
              </Field>
              <Field label="SMTP password" htmlFor="smtpPassword" hint="Leave blank to keep the current one">
                <Input
                  id="smtpPassword"
                  type="password"
                  autoComplete="off"
                  value={smtpPassword}
                  onChange={(event) => setSmtpPassword(event.target.value)}
                  disabled={!canManage}
                />
              </Field>
              <Field label="From name" htmlFor="fromName">
                <Input
                  id="fromName"
                  value={settings.email.fromName}
                  onChange={(event) => update("email", { fromName: event.target.value })}
                  disabled={!canManage}
                />
              </Field>
              <Field label="From email" htmlFor="fromEmail">
                <Input
                  id="fromEmail"
                  type="email"
                  value={settings.email.fromEmail}
                  onChange={(event) => update("email", { fromEmail: event.target.value })}
                  disabled={!canManage}
                />
              </Field>

              <div className="sm:col-span-2">
                <ToggleRow
                  label="Use TLS/SSL"
                  checked={settings.email.secure}
                  onCheckedChange={(value) => update("email", { secure: value })}
                />
              </div>

              <div className="sm:col-span-2 flex justify-end">
                {canManage ? (
                  <Button loading={saving} onClick={() => void save("email")}>
                    Save changes
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System</CardTitle>
              <CardDescription>Maintenance, caching and list sizes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                label="Maintenance mode"
                description="Show a maintenance page to storefront visitors"
                checked={settings.system.maintenanceMode}
                onCheckedChange={(value) => update("system", { maintenanceMode: value })}
              />

              <Field label="Maintenance message" htmlFor="maintenanceMessage">
                <Textarea
                  id="maintenanceMessage"
                  rows={2}
                  value={settings.system.maintenanceMessage}
                  onChange={(event) => update("system", { maintenanceMessage: event.target.value })}
                  disabled={!canManage}
                />
              </Field>

              <ToggleRow
                label="Enable caching"
                checked={settings.system.cacheEnabled}
                onCheckedChange={(value) => update("system", { cacheEnabled: value })}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Cache TTL (seconds)" htmlFor="cacheTtl">
                  <Input
                    id="cacheTtl"
                    type="number"
                    min={0}
                    value={settings.system.cacheTtlSeconds}
                    onChange={(event) => update("system", { cacheTtlSeconds: Number(event.target.value) })}
                    disabled={!canManage}
                  />
                </Field>
                <Field label="Rows per page" htmlFor="paginationSize">
                  <NativeSelect
                    id="paginationSize"
                    value={settings.system.paginationSize}
                    onChange={(event) => update("system", { paginationSize: Number(event.target.value) })}
                    disabled={!canManage}
                  >
                    {[10, 20, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>

              <div className="flex justify-end">
                {canManage ? (
                  <Button loading={saving} onClick={() => void save("system")}>
                    Save changes
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
