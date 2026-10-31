"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";

import type { OwnerStore } from "@/lib/owner-page";
import { GENERIC_NETWORKS, MAX_CUSTOM_RULES, type CustomRule } from "@/lib/affiliate/rewrite";
import { HOME_SECTIONS } from "@/lib/tenant/sections";
import { limitsFor } from "@/lib/plans";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Checkbox, Field, ToggleRow } from "@/components/ui/form-field";
import { ImageUpload } from "@/components/dashboard/image-upload";
import { ThemeEditor } from "@/components/dashboard/theme-editor";
import { saveSection } from "@/components/dashboard/save";
import type { TenantTheme } from "@/lib/tenant/theme";

type FormProps = { store: OwnerStore; onSaved?: () => void; submitLabel?: string };

function SubmitRow({ busy, label }: { busy: boolean; label: string }) {
  return (
    <Button type="submit" disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : null}
      {label}
    </Button>
  );
}

/** Store name, tagline, contact, footer text, logo, favicon and social links. */
export function BrandingForm({ store, onSaved, submitLabel = "Save branding", only }: FormProps & { only?: "logo" }) {
  const [form, setForm] = useState({
    name: store.name,
    tagline: store.branding.tagline ?? "",
    footerText: store.branding.footerText ?? "",
    contactEmail: store.branding.contactEmail ?? "",
    logoUrl: store.branding.logoUrl ?? "",
    faviconUrl: store.branding.faviconUrl ?? "",
    showPoweredBy: store.branding.showPoweredBy !== false,
    social: {
      facebook: "",
      instagram: "",
      x: "",
      youtube: "",
      telegram: "",
      whatsapp: "",
      ...store.branding.social,
    },
  });
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        const saved = await saveSection({ section: "branding", ...form }, "Branding saved");
        setBusy(false);
        if (saved) onSaved?.();
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Logo" hint="PNG, WebP or SVG, up to 1 MB">
          <ImageUpload kind="logo" value={form.logoUrl} onChange={(logoUrl) => set({ logoUrl })} />
        </Field>
        <Field label="Favicon" hint="Square works best, up to 1 MB">
          <ImageUpload kind="favicon" value={form.faviconUrl} onChange={(faviconUrl) => set({ faviconUrl })} />
        </Field>
      </div>

      {only === "logo" ? null : (
        <>
          <Field label="Store name" htmlFor="b-name">
            <Input id="b-name" value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} />
          </Field>
          <Field label="Tagline" htmlFor="b-tag">
            <Input id="b-tag" value={form.tagline} onChange={(e) => set({ tagline: e.target.value })} maxLength={160} />
          </Field>
          <Field label="Footer text" htmlFor="b-foot" hint="Shown above the affiliate disclosure">
            <Textarea id="b-foot" value={form.footerText} onChange={(e) => set({ footerText: e.target.value })} maxLength={500} />
          </Field>
          <Field label="Contact email" htmlFor="b-mail">
            <Input id="b-mail" type="email" value={form.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} />
          </Field>
          {store.plan === "pro" ? (
            <ToggleRow
              label="Show “Powered by ManaDeals”"
              description="Pro stores can remove the credit from the footer"
              checked={form.showPoweredBy}
              onCheckedChange={(showPoweredBy) => set({ showPoweredBy })}
            />
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(form.social) as (keyof typeof form.social)[]).map((network) => (
              <Field key={network} label={`${network[0]!.toUpperCase()}${network.slice(1)} URL`} htmlFor={`b-${network}`}>
                <Input
                  id={`b-${network}`}
                  placeholder="https://"
                  value={form.social[network]}
                  onChange={(e) => set({ social: { ...form.social, [network]: e.target.value } })}
                />
              </Field>
            ))}
          </div>
        </>
      )}
      <SubmitRow busy={busy} label={submitLabel} />
    </form>
  );
}

export function ThemeForm({ store, onSaved, submitLabel = "Save theme" }: FormProps) {
  const [theme, setTheme] = useState<TenantTheme>(store.theme);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        const saved = await saveSection({ section: "theme", ...theme }, "Theme saved");
        setBusy(false);
        if (saved) onSaved?.();
      }}
    >
      <ThemeEditor value={theme} onChange={setTheme} />
      <SubmitRow busy={busy} label={submitLabel} />
    </form>
  );
}

export function AffiliateForm({ store, onSaved, submitLabel = "Save affiliate IDs" }: FormProps) {
  const [amazon, setAmazon] = useState(store.affiliate.amazonAssociateTag);
  const [flipkart, setFlipkart] = useState(store.affiliate.flipkartAffiliateId);
  const [generic, setGeneric] = useState<Record<string, string>>(
    Object.fromEntries(store.affiliate.generic.map((entry) => [entry.network, entry.id])),
  );
  const [custom, setCustom] = useState<CustomRule[]>(store.affiliate.custom ?? []);
  const [busy, setBusy] = useState(false);

  const updateRule = (index: number, patch: Partial<CustomRule>) =>
    setCustom((rules) => rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        const saved = await saveSection(
          {
            section: "affiliate",
            custom: custom.map((rule) => ({ ...rule, name: rule.name.trim(), domain: rule.domain.trim() })),
            amazonAssociateTag: amazon.trim(),
            flipkartAffiliateId: flipkart.trim(),
            generic: Object.entries(generic)
              .filter(([, id]) => id.trim())
              .map(([network, id]) => ({ network, id: id.trim() })),
          },
          "Affiliate IDs saved",
        );
        setBusy(false);
        if (saved) onSaved?.();
      }}
    >
      <p className="rounded-md bg-[var(--muted)] p-3 text-sm text-[var(--muted-foreground)]">
        Leave a field blank and clicks for that retailer are credited to ManaDeals instead. Your IDs are private and
        never shown on your store.
      </p>
      <Field label="Amazon Associates tag" htmlFor="a-amz" hint="Looks like yourname-21">
        <Input id="a-amz" value={amazon} onChange={(e) => setAmazon(e.target.value)} placeholder="yourname-21" />
      </Field>
      <Field label="Flipkart affiliate ID" htmlFor="a-fk">
        <Input id="a-fk" value={flipkart} onChange={(e) => setFlipkart(e.target.value)} />
      </Field>
      {Object.entries(GENERIC_NETWORKS).map(([key, network]) => (
        <Field
          key={key}
          label={`${network.label} ID`}
          htmlFor={`a-${key}`}
          hint={network.pattern ? "Used for retailers without their own programme" : "Saved now; applied once this network is enabled"}
        >
          <Input id={`a-${key}`} value={generic[key] ?? ""} onChange={(e) => setGeneric({ ...generic, [key]: e.target.value })} />
        </Field>
      ))}

      <div className="space-y-3 border-t border-[var(--border)] pt-5">
        <div>
          <h3 className="text-sm font-semibold">Other companies &amp; networks</h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            Add any retailer or affiliate network. Pick a parameter (adds <code>?affid=your-id</code> to links on that
            site) or a link wrapper (the network&apos;s own redirect link). Use <code>*</code> as the website to apply a
            wrapper to every other retailer.
          </p>
        </div>

        {custom.map((rule, index) => (
          <div key={index} className="space-y-3 rounded-lg border border-[var(--border)] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Company / network name" htmlFor={`c-name-${index}`}>
                <Input
                  id={`c-name-${index}`}
                  value={rule.name}
                  onChange={(e) => updateRule(index, { name: e.target.value })}
                  placeholder="Myntra"
                />
              </Field>
              <Field label="Website" htmlFor={`c-domain-${index}`} hint="e.g. myntra.com, or * for all others">
                <Input
                  id={`c-domain-${index}`}
                  value={rule.domain}
                  onChange={(e) => updateRule(index, { domain: e.target.value })}
                  placeholder="myntra.com"
                />
              </Field>
            </div>

            <div className="flex gap-4 text-sm">
              {(["param", "template"] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`c-mode-${index}`}
                    checked={rule.mode === mode}
                    onChange={() => updateRule(index, { mode })}
                  />
                  {mode === "param" ? "Add a parameter to the link" : "Wrap in a network link"}
                </label>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {rule.mode === "param" ? (
                <Field label="Parameter name" htmlFor={`c-param-${index}`} hint="e.g. affid, ref, tag">
                  <Input
                    id={`c-param-${index}`}
                    value={rule.param}
                    onChange={(e) => updateRule(index, { param: e.target.value })}
                    placeholder="affid"
                  />
                </Field>
              ) : (
                <Field
                  label="Network link"
                  htmlFor={`c-tpl-${index}`}
                  hint="Must be https and contain {url}; {id} is replaced by your ID"
                  className="sm:col-span-2"
                >
                  <Input
                    id={`c-tpl-${index}`}
                    value={rule.template}
                    onChange={(e) => updateRule(index, { template: e.target.value })}
                    placeholder="https://network.com/go?id={id}&url={url}"
                  />
                </Field>
              )}
              <Field label="Your ID" htmlFor={`c-value-${index}`}>
                <Input id={`c-value-${index}`} value={rule.value} onChange={(e) => updateRule(index, { value: e.target.value })} />
              </Field>
            </div>

            <Button type="button" variant="ghost" size="sm" onClick={() => setCustom((rules) => rules.filter((_, i) => i !== index))}>
              <Trash2 />
              Remove
            </Button>
          </div>
        ))}

        {custom.length < MAX_CUSTOM_RULES ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setCustom((rules) => [...rules, { name: "", domain: "", mode: "param", param: "", value: "", template: "" }])
            }
          >
            <Plus />
            Add another company
          </Button>
        ) : null}
      </div>

      <SubmitRow busy={busy} label={submitLabel} />
    </form>
  );
}

type CategoryOption = { _id: string; name: string; parent: string | null };
type ProductOption = { _id: string; name: string; salePrice: number };

/** Category selection, deal-of-the-day pin and home section order. */
export function CatalogForm({ store, onSaved, submitLabel = "Save catalogue", sectionsOnly }: FormProps & { sectionsOnly?: boolean }) {
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);
  const [selected, setSelected] = useState<string[]>(store.catalog.categories);
  const [pinned, setPinned] = useState<{ id: string; name: string } | null>(
    store.catalog.dealOfTheDay ? { id: store.catalog.dealOfTheDay, name: "Pinned product" } : null,
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductOption[]>([]);
  const [sections, setSections] = useState(store.catalog.sections);
  const [busy, setBusy] = useState(false);
  const limit = limitsFor(store.plan).homeSections;
  const enabledCount = sections.filter((section) => section.enabled).length;

  useEffect(() => {
    if (sectionsOnly) return;
    apiClient
      .get<CategoryOption[]>("/api/owner/options?type=categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [sectionsOnly]);

  const move = (index: number, delta: number) =>
    setSections((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  async function search(term: string) {
    setQuery(term);
    const data = await apiClient.get<ProductOption[]>(`/api/owner/options?type=products&q=${encodeURIComponent(term)}`).catch(() => []);
    setResults(data);
  }

  const parents = (categories ?? []).filter((category) => !category.parent);

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        const saved = await saveSection(
          { section: "catalog", categories: selected, dealOfTheDay: pinned?.id ?? null, sections },
          "Catalogue saved",
        );
        setBusy(false);
        if (saved) onSaved?.();
      }}
    >
      {sectionsOnly ? null : (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Categories to show</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Pick none to show the whole catalogue.</p>
            {categories === null ? <p className="text-sm text-[var(--muted-foreground)]">Loading…</p> : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {parents.map((category) => (
                <label key={category._id} className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm">
                  <Checkbox
                    checked={selected.includes(category._id)}
                    onCheckedChange={(checked) =>
                      setSelected((current) => (checked ? [...current, category._id] : current.filter((id) => id !== category._id)))
                    }
                  />
                  {category.name}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Deal of the day</h3>
            {pinned ? (
              <div className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2 text-sm">
                <span>{pinned.name}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPinned(null)}>
                  Unpin
                </Button>
              </div>
            ) : null}
            <Input placeholder="Search products to pin…" value={query} onChange={(e) => search(e.target.value)} />
            {results.length > 0 && query ? (
              <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
                {results.map((product) => (
                  <li key={product._id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--muted)]"
                      onClick={() => {
                        setPinned({ id: product._id, name: product.name });
                        setQuery("");
                        setResults([]);
                      }}
                    >
                      <span className="line-clamp-1">{product.name}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">₹{product.salePrice}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">
          Home page sections{" "}
          <span className="font-normal text-[var(--muted-foreground)]">
            ({enabledCount}/{limit} on your plan)
          </span>
        </h3>
        {sections.map((section, index) => {
          const label = HOME_SECTIONS.find((entry) => entry.key === section.key)?.label ?? section.key;
          return (
            <div key={section.key} className="flex items-center gap-2">
              <div className="flex-1">
                <ToggleRow
                  label={label}
                  checked={section.enabled}
                  onCheckedChange={(enabled) =>
                    setSections((current) => current.map((entry) => (entry.key === section.key ? { ...entry, enabled } : entry)))
                  }
                />
              </div>
              <Button type="button" variant="outline" size="icon" aria-label={`Move ${label} up`} onClick={() => move(index, -1)}>
                <ArrowUp />
              </Button>
              <Button type="button" variant="outline" size="icon" aria-label={`Move ${label} down`} onClick={() => move(index, 1)}>
                <ArrowDown />
              </Button>
            </div>
          );
        })}
        {enabledCount > limit ? (
          <p className="text-xs font-medium text-[var(--destructive)]">Switch off {enabledCount - limit} section(s) or upgrade to Pro.</p>
        ) : null}
      </div>

      <SubmitRow busy={busy} label={submitLabel} />
    </form>
  );
}
