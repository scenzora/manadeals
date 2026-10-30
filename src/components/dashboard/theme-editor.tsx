"use client";

import { useState } from "react";

import { previewVariables, THEME_FONTS, type TenantTheme } from "@/lib/tenant/theme";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";

const COLOURS: { key: "primary" | "accent" | "background" | "text"; label: string }[] = [
  { key: "primary", label: "Brand colour" },
  { key: "accent", label: "Accent tint" },
  { key: "background", label: "Background" },
  { key: "text", label: "Text" },
];

/** Colour, font, radius and mode controls with a live storefront preview. */
export function ThemeEditor({ value, onChange }: { value: TenantTheme; onChange: (theme: TenantTheme) => void }) {
  const [previewDark, setPreviewDark] = useState(false);
  const set = <K extends keyof TenantTheme>(key: K, next: TenantTheme[K]) => onChange({ ...value, [key]: next });
  const showDark = value.mode === "dark" || (value.mode === "auto" && previewDark);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {COLOURS.map(({ key, label }) => (
            <Field key={key} label={label} htmlFor={`theme-${key}`}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={label}
                  value={value[key]}
                  onChange={(event) => set(key, event.target.value)}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-[var(--input)] bg-transparent p-1"
                />
                <Input
                  id={`theme-${key}`}
                  value={value[key]}
                  maxLength={7}
                  onChange={(event) => set(key, event.target.value)}
                  className="font-mono"
                />
              </div>
            </Field>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Font" htmlFor="theme-font">
            <NativeSelect id="theme-font" value={value.fontFamily} onChange={(e) => set("fontFamily", e.target.value as TenantTheme["fontFamily"])}>
              {Object.entries(THEME_FONTS).map(([key, font]) => (
                <option key={key} value={key}>
                  {font.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Light / dark" htmlFor="theme-mode">
            <NativeSelect id="theme-mode" value={value.mode} onChange={(e) => set("mode", e.target.value as TenantTheme["mode"])}>
              <option value="light">Always light</option>
              <option value="dark">Always dark</option>
              <option value="auto">Follow visitor&apos;s device</option>
            </NativeSelect>
          </Field>
        </div>

        <Field label={`Corner roundness (${value.radius}px)`} htmlFor="theme-radius">
          <input
            id="theme-radius"
            type="range"
            min={0}
            max={24}
            value={value.radius}
            onChange={(event) => set("radius", Number(event.target.value))}
            className="w-full accent-[var(--primary)]"
          />
        </Field>

        {value.mode === "auto" ? (
          <button type="button" className="text-xs text-[var(--primary)] underline" onClick={() => setPreviewDark((v) => !v)}>
            Preview {previewDark ? "light" : "dark"} appearance
          </button>
        ) : null}
      </div>

      {/* Scoped variables: the preview themes itself without touching the dashboard. */}
      <div
        style={previewVariables(value, showDark) as React.CSSProperties}
        className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 py-3">
          <span className="text-sm font-semibold">Your Store</span>
          <span className="text-xs text-[var(--muted-foreground)]">Deals · Coupons · Blog</span>
        </div>
        <div className="space-y-3 bg-[var(--secondary)] px-4 py-6">
          <p className="text-lg font-semibold text-[var(--secondary-foreground)]">Real discounts, honestly tracked</p>
          <span className="inline-block rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2 text-xs font-medium text-[var(--primary-foreground)]">
            Browse products
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          {[1, 2].map((n) => (
            <div key={n} className="space-y-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3">
              <div className="h-14 rounded-[var(--radius)] bg-[var(--muted)]" />
              <p className="text-xs font-medium">Sample product {n}</p>
              <p className="text-sm font-semibold">₹1,499</p>
              <span className="inline-block rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent-foreground)]">
                40% off
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
