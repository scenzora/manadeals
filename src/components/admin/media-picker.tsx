"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ImagePlus, Link2, Search, Upload } from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils/cn";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { MEDIA_FOLDERS, type MediaFolder } from "@/lib/validations/media";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, Skeleton } from "@/components/ui/states";
import type { Paginated } from "@/types";

export type MediaItem = {
  _id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  folder: string;
  alt: string;
};

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Media browser + uploader. Used both as the standalone library page body and
 * as a picker dialog from every image field in the admin.
 */
export function MediaPicker({
  open,
  onClose,
  onSelect,
  folder = "general",
  multiple = false,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (urls: string[]) => void;
  folder?: MediaFolder;
  multiple?: boolean;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState<string>(folder);
  const [selected, setSelected] = useState<string[]>([]);
  const [manualUrl, setManualUrl] = useState("");
  const [storageIssue, setStorageIssue] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const { uploadMany, uploading, progress, error, setError } = useMediaUpload(folder);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ limit: "48", sort: "createdAt", order: "desc" });
      if (search) query.set("search", search);
      if (folderFilter) query.set("folder", folderFilter);

      const data = await apiClient.get<Paginated<MediaItem>>(`/api/admin/media?${query}`);
      setItems(data.items);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not load the media library");
    } finally {
      setLoading(false);
    }
  }, [search, folderFilter]);

  useEffect(() => {
    if (!open) return;
    // Clearing the selection and refetching when the dialog opens is the point
    // of this effect, not a render-derived state update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected([]);
    void load();
  }, [open, load]);

  // Surfaces a misconfigured bucket up front instead of on a failed upload.
  useEffect(() => {
    if (!open) return;
    apiClient
      .post<{ configured: boolean; issue: string | null }>("/api/admin/media")
      .then((status) => setStorageIssue(status.configured ? null : status.issue))
      .catch(() => undefined);
  }, [open]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const uploaded = await uploadMany(Array.from(files));
    if (uploaded.length > 0) {
      toast.success(`Uploaded ${uploaded.length} file(s)`);
      await load();
      if (!multiple) {
        onSelect([uploaded[0]!.url]);
        onClose();
        return;
      }
      setSelected((previous) => [...previous, ...uploaded.map((media) => media.url)]);
    }
  }

  function toggle(url: string) {
    if (!multiple) {
      onSelect([url]);
      onClose();
      return;
    }
    setSelected((previous) =>
      previous.includes(url) ? previous.filter((entry) => entry !== url) : [...previous, url],
    );
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
          <DialogDescription>
            Images are stored in Cloudflare R2 and served from your media domain.
          </DialogDescription>
        </DialogHeader>

        {storageIssue ? (
          <p className="flex items-start gap-2 rounded-lg bg-[#fffaeb] px-4 py-3 text-sm text-[var(--warning)]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Uploads are unavailable: {storageIssue}. You can still paste an image URL below.
            </span>
          </p>
        ) : null}

        <Tabs defaultValue="library">
          <TabsList>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="url">Paste URL</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-48 flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by filename or alt text…"
                  className="pl-9"
                />
              </div>
              <NativeSelect
                value={folderFilter}
                onChange={(event) => setFolderFilter(event.target.value)}
                className="w-40"
              >
                <option value="">All folders</option>
                {MEDIA_FOLDERS.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            {loading ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {Array.from({ length: 12 }).map((_, index) => (
                  <Skeleton key={index} className="aspect-square w-full" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={<ImagePlus className="size-6" />}
                title="Nothing in this folder yet"
                description="Upload an image to get started."
              />
            ) : (
              <div className="grid max-h-96 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4 md:grid-cols-6">
                {items.map((item) => {
                  const isSelected = selected.includes(item.url);
                  return (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => toggle(item.url)}
                      title={item.filename}
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-lg border bg-white",
                        isSelected ? "border-[var(--primary)] ring-2 ring-[var(--primary)]" : "border-[var(--border)]",
                      )}
                    >
                      <Image
                        src={item.url}
                        alt={item.alt || item.filename}
                        fill
                        sizes="120px"
                        className="object-contain p-1"
                        unoptimized
                      />
                      {isSelected ? (
                        <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-[var(--primary)] text-white">
                          <Check className="size-3" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple={multiple}
              className="hidden"
              onChange={(event) => void handleFiles(event.target.files)}
            />

            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void handleFiles(event.dataTransfer.files);
              }}
              className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center"
            >
              <Upload className="mx-auto mb-2 size-7 text-[var(--muted-foreground)]" />
              <p className="font-medium">Drop images here</p>
              <p className="mb-4 text-xs text-[var(--muted-foreground)]">
                JPEG, PNG, WebP, AVIF, GIF or SVG · up to 8 MB each
              </p>
              <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} loading={uploading}>
                Choose file{multiple ? "s" : ""}
              </Button>

              {uploading ? (
                <div className="mx-auto mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-[var(--muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--primary)] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              ) : null}

              {error ? (
                <p className="mt-3 text-sm text-[var(--destructive)]" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-3">
            <Field
              label="Image URL"
              htmlFor="manualUrl"
              hint="Use this for images already hosted elsewhere"
            >
              <Input
                id="manualUrl"
                placeholder="https://"
                value={manualUrl}
                onChange={(event) => setManualUrl(event.target.value)}
              />
            </Field>
            <Button
              type="button"
              disabled={!manualUrl.trim()}
              onClick={() => {
                onSelect([manualUrl.trim()]);
                setManualUrl("");
                onClose();
              }}
            >
              <Link2 />
              Use this URL
            </Button>
          </TabsContent>
        </Tabs>

        {multiple ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={selected.length === 0}
              onClick={() => {
                onSelect(selected);
                setError(null);
                onClose();
              }}
            >
              Add {selected.length} image{selected.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
