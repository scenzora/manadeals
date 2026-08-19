"use client";

import { useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { formatNumber } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, ToggleRow } from "@/components/ui/form-field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Seo = {
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

type Coverage = Record<"products" | "categories" | "posts", { total: number; withSeo: number }>;

export function SeoClient({
  seo: initial,
  canManage,
  coverage,
}: {
  seo: Seo;
  canManage: boolean;
  coverage: Coverage;
}) {
  const [seo, setSeo] = useState<Seo>(initial);
  const [saving, setSaving] = useState(false);

  function update(patch: Partial<Seo>) {
    setSeo((previous) => ({ ...previous, ...patch }));
  }

  async function save() {
    setSaving(true);
    try {
      await apiClient.put("/api/admin/settings", { seo });
      toast.success("SEO settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save SEO settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="SEO"
        description="Global metadata defaults. Products, categories and articles each carry their own overrides."
        actions={
          canManage ? (
            <Button loading={saving} onClick={() => void save()}>
              Save changes
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            ["Products", coverage.products],
            ["Categories", coverage.categories],
            ["Articles", coverage.posts],
          ] as const
        ).map(([label, data]) => {
          const percentage = data.total ? Math.round((data.withSeo / data.total) * 100) : 0;
          return (
            <Card key={label}>
              <CardContent className="space-y-2 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                  {label} with SEO title
                </p>
                <p className="text-2xl font-semibold">
                  {formatNumber(data.withSeo)}
                  <span className="text-base font-normal text-[var(--muted-foreground)]">
                    {" "}
                    / {formatNumber(data.total)}
                  </span>
                </p>
                <Badge variant={percentage >= 80 ? "success" : percentage >= 40 ? "warning" : "danger"}>
                  {percentage}% covered
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default metadata</CardTitle>
          <CardDescription>
            Applied by the Next.js Metadata API wherever a page does not define its own.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Site title" htmlFor="seoTitle" className="sm:col-span-2">
            <Input
              id="seoTitle"
              value={seo.title}
              onChange={(event) => update({ title: event.target.value })}
              disabled={!canManage}
            />
          </Field>

          <Field
            label="Meta description"
            htmlFor="seoDescription"
            hint={`${seo.description.length}/160 characters`}
            className="sm:col-span-2"
          >
            <Textarea
              id="seoDescription"
              rows={3}
              value={seo.description}
              onChange={(event) => update({ description: event.target.value })}
              disabled={!canManage}
            />
          </Field>

          <Field label="Keywords" htmlFor="seoKeywords" hint="Comma separated" className="sm:col-span-2">
            <Input
              id="seoKeywords"
              value={seo.keywords.join(", ")}
              onChange={(event) =>
                update({
                  keywords: event.target.value
                    .split(",")
                    .map((keyword) => keyword.trim())
                    .filter(Boolean),
                })
              }
              disabled={!canManage}
            />
          </Field>

          <Field label="Open Graph image URL" htmlFor="ogImage">
            <Input
              id="ogImage"
              placeholder="https://"
              value={seo.ogImage}
              onChange={(event) => update({ ogImage: event.target.value })}
              disabled={!canManage}
            />
          </Field>

          <Field label="Canonical URL" htmlFor="canonicalUrl">
            <Input
              id="canonicalUrl"
              placeholder="https://manadeals.online"
              value={seo.canonicalUrl}
              onChange={(event) => update({ canonicalUrl: event.target.value })}
              disabled={!canManage}
            />
          </Field>

          <Field label="Twitter handle" htmlFor="twitterHandle">
            <Input
              id="twitterHandle"
              placeholder="@manadeals"
              value={seo.twitterHandle}
              onChange={(event) => update({ twitterHandle: event.target.value })}
              disabled={!canManage}
            />
          </Field>

          <Field label="Twitter card" htmlFor="twitterCard">
            <NativeSelect
              id="twitterCard"
              value={seo.twitterCard}
              onChange={(event) => update({ twitterCard: event.target.value })}
              disabled={!canManage}
            >
              <option value="summary">summary</option>
              <option value="summary_large_image">summary_large_image</option>
            </NativeSelect>
          </Field>

          <Field label="Robots" htmlFor="robots" hint="e.g. index, follow">
            <Input
              id="robots"
              value={seo.robots}
              onChange={(event) => update({ robots: event.target.value })}
              disabled={!canManage}
            />
          </Field>

          <Field label="Google Analytics ID" htmlFor="googleAnalyticsId">
            <Input
              id="googleAnalyticsId"
              placeholder="G-XXXXXXX"
              value={seo.googleAnalyticsId}
              onChange={(event) => update({ googleAnalyticsId: event.target.value })}
              disabled={!canManage}
            />
          </Field>

          <Field
            label="Google site verification"
            htmlFor="googleSiteVerification"
            className="sm:col-span-2"
          >
            <Input
              id="googleSiteVerification"
              value={seo.googleSiteVerification}
              onChange={(event) => update({ googleSiteVerification: event.target.value })}
              disabled={!canManage}
            />
          </Field>

          <div className="sm:col-span-2">
            <ToggleRow
              label="Generate sitemap.xml"
              description="Include products, categories and published articles"
              checked={seo.sitemapEnabled}
              onCheckedChange={(value) => update({ sitemapEnabled: value })}
            />
          </div>

          {canManage ? (
            <div className="sm:col-span-2 flex justify-end">
              <Button loading={saving} onClick={() => void save()}>
                Save changes
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search result preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xl rounded-lg border border-[var(--border)] p-4">
            <p className="text-xs text-[var(--success)]">
              {seo.canonicalUrl || "https://manadeals.online"}
            </p>
            <p className="text-lg text-[#1a0dab]">{seo.title || "ManaDeals.online"}</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              {seo.description || "Add a meta description to control this text."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
