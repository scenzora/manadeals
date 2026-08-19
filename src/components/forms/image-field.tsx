"use client";

import Image from "next/image";
import { useState } from "react";
import { ImagePlus, Pencil, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { MediaPicker } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-field";
import type { MediaFolder } from "@/lib/validations/media";

/**
 * Single image form control: shows a preview and opens the media library.
 * The value is always a URL string, so it drops straight into the existing
 * schemas without any model change.
 */
export function ImageField({
  label,
  value,
  onChange,
  folder = "general",
  error,
  hint,
  required,
  className,
  aspect = "square",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: MediaFolder;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  aspect?: "square" | "wide";
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {value ? (
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "relative shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-white",
              aspect === "square" ? "size-24" : "h-20 w-36",
            )}
          >
            <Image src={value} alt="" fill sizes="144px" className="object-contain p-1" unoptimized />
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <p className="break-all text-xs text-[var(--muted-foreground)]">{value}</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
                <Pencil />
                Replace
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
                <X />
                Clear
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] py-6 text-sm transition-colors hover:border-[var(--primary)] hover:bg-[var(--accent)]/40",
          )}
        >
          <ImagePlus className="size-5 text-[var(--muted-foreground)]" />
          <span className="font-medium">Choose an image</span>
          <span className="text-xs text-[var(--muted-foreground)]">Upload, pick from library, or paste a URL</span>
        </button>
      )}

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(urls) => urls[0] && onChange(urls[0])}
        folder={folder}
      />
    </Field>
  );
}

/** Gallery variant: an ordered list of image URLs. */
export function ImageListField({
  label,
  value,
  onChange,
  folder = "general",
  error,
  hint,
  className,
  max = 12,
}: {
  label: string;
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: MediaFolder;
  error?: string;
  hint?: string;
  className?: string;
  max?: number;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function add(urls: string[]) {
    // De-duplicated, and capped so a stray multi-select cannot blow the limit.
    const next = [...value, ...urls.filter((url) => !value.includes(url))].slice(0, max);
    onChange(next);
  }

  return (
    <Field label={label} error={error} hint={hint ?? `Up to ${max} images`} className={className}>
      <div className="flex flex-wrap gap-2">
        {value.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="group relative size-20 overflow-hidden rounded-lg border border-[var(--border)] bg-white"
          >
            <Image src={url} alt="" fill sizes="80px" className="object-contain p-1" unoptimized />
            <button
              type="button"
              onClick={() => onChange(value.filter((entry) => entry !== url))}
              aria-label="Remove image"
              className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}

        {value.length < max ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--border)] text-xs transition-colors hover:border-[var(--primary)] hover:bg-[var(--accent)]/40"
          >
            <ImagePlus className="size-4 text-[var(--muted-foreground)]" />
            Add
          </button>
        ) : null}
      </div>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={add}
        folder={folder}
        multiple
      />
    </Field>
  );
}
