"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const MAX_BYTES = 1024 * 1024;
const TYPES = ["image/png", "image/webp", "image/svg+xml"];

export function ImageUpload({
  kind,
  value,
  onChange,
}: {
  kind: "logo" | "favicon";
  value: string;
  onChange: (url: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (!TYPES.includes(file.type)) return toast.error("Use a PNG, WebP or SVG image");
    if (file.size > MAX_BYTES) return toast.error("Images must be 1 MB or smaller");

    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("kind", kind);
      const response = await fetch("/api/owner/upload", { method: "POST", body, credentials: "same-origin" });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.error ?? "Upload failed");
      onChange(result.data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-md border border-[var(--border)] bg-[var(--muted)]">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={`${kind} preview`} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-[var(--muted-foreground)]">None</span>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        className="hidden"
        onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])}
      />
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="animate-spin" /> : <Upload />}
        {value ? "Replace" : "Upload"}
      </Button>
      {value ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
          <X /> Remove
        </Button>
      ) : null}
    </div>
  );
}
