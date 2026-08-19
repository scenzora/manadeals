"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AlertTriangle, Check, Copy, HardDrive, ImagePlus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { apiClient, ApiClientError } from "@/lib/api-client";
import { useResourceList } from "@/hooks/use-resource-list";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { hasPermission } from "@/lib/permissions";
import { MEDIA_FOLDERS } from "@/lib/validations/media";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { formatBytes, type MediaItem } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterSelect } from "@/components/tables/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import type { AdminSession } from "@/types";

type Storage = { configured: boolean; issue: string | null; publicUrl: string };

export function MediaClient({ session, storage }: { session: AdminSession; storage: Storage }) {
  const list = useResourceList<MediaItem & { createdAt: string }>("/api/admin/media", {});
  const { uploadMany, uploading, progress, error: uploadError } = useMediaUpload("general");

  const fileInput = useRef<HTMLInputElement>(null);
  const [viewing, setViewing] = useState<MediaItem | null>(null);
  const [references, setReferences] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<MediaItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [altDraft, setAltDraft] = useState("");

  const canUpload = hasPermission(session, "media.upload");
  const canDelete = hasPermission(session, "media.delete");

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const uploaded = await uploadMany(Array.from(files));
    if (uploaded.length > 0) {
      toast.success(`Uploaded ${uploaded.length} file(s)`);
      await list.refresh();
    }
  }

  async function openDetail(item: MediaItem) {
    setViewing(item);
    setAltDraft(item.alt ?? "");
    setReferences(null);
    try {
      const data = await apiClient.get<{ references: number }>(`/api/admin/media/${item._id}`);
      setReferences(data.references);
    } catch {
      setReferences(null);
    }
  }

  async function saveAlt() {
    if (!viewing) return;
    try {
      await apiClient.put(`/api/admin/media/${viewing._id}`, { alt: altDraft, tags: [] });
      toast.success("Saved");
      setViewing(null);
      await list.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    }
  }

  async function handleDelete(force = false) {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiClient.delete(`/api/admin/media/${deleting._id}${force ? "?force=true" : ""}`);
      toast.success("Image deleted");
      setDeleting(null);
      setViewing(null);
      await list.refresh();
    } catch (error) {
      // A 409 means the image is still referenced; offer to force it.
      if (error instanceof ApiClientError && error.status === 409) {
        toast.error(error.message, {
          action: { label: "Delete anyway", onClick: () => void handleDelete(true) },
        });
      } else {
        toast.error(error instanceof Error ? error.message : "Could not delete the image");
      }
    } finally {
      setBusy(false);
    }
  }

  function copyUrl(url: string) {
    void navigator.clipboard.writeText(url);
    toast.success("URL copied");
  }

  return (
    <div>
      <PageHeader
        title="Media"
        description="Images stored in Cloudflare R2 and served from your media domain."
        actions={
          canUpload ? (
            <>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => void handleFiles(event.target.files)}
              />
              <Button onClick={() => fileInput.current?.click()} loading={uploading}>
                <Upload />
                Upload images
              </Button>
            </>
          ) : undefined
        }
      />

      {!storage.configured ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--warning)]/30 bg-[#fffaeb] px-4 py-3 text-sm text-[var(--warning)]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Storage is not fully configured</p>
            <p>{storage.issue}</p>
            <p className="mt-1 text-xs">
              Existing images still display. Add the missing values to your environment and redeploy
              to enable uploads.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm">
          <HardDrive className="size-4 text-[var(--muted-foreground)]" />
          <span className="text-[var(--muted-foreground)]">Delivering from</span>
          <code className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-xs">{storage.publicUrl}</code>
          <Badge variant="success" className="ml-auto">
            <Check className="size-3" />
            Connected
          </Badge>
        </div>
      )}

      {uploading ? (
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
          <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      {uploadError ? <ErrorState message={uploadError} /> : null}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={list.search}
          onChange={(event) => list.setSearch(event.target.value)}
          placeholder="Search by filename or alt text…"
          className="max-w-xs"
        />
        <FilterSelect
          value={list.filters.folder as string}
          onChange={(value) => list.setFilter("folder", value)}
          placeholder="All folders"
          options={[...MEDIA_FOLDERS]}
        />
        <span className="ml-auto text-sm text-[var(--muted-foreground)]">
          {formatNumber(list.total)} image{list.total === 1 ? "" : "s"}
        </span>
      </div>

      {list.error ? <ErrorState message={list.error} /> : null}

      {list.loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square w-full" />
          ))}
        </div>
      ) : list.items.length === 0 ? (
        <EmptyState
          icon={<ImagePlus className="size-6" />}
          title="No images yet"
          description={
            canUpload
              ? "Upload product photos, banners and logos here, then pick them from any form."
              : "Nothing has been uploaded yet."
          }
          action={
            canUpload ? <Button onClick={() => fileInput.current?.click()}>Upload images</Button> : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {list.items.map((item) => (
                <div key={item._id} className="group space-y-1.5">
                  <button
                    type="button"
                    onClick={() => void openDetail(item)}
                    className="relative block aspect-square w-full overflow-hidden rounded-lg border border-[var(--border)] bg-white transition-colors hover:border-[var(--primary)]"
                  >
                    <Image
                      src={item.url}
                      alt={item.alt || item.filename}
                      fill
                      sizes="160px"
                      className="object-contain p-1.5"
                      unoptimized
                    />
                  </button>
                  <p className="truncate text-xs" title={item.filename}>
                    {item.filename}
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    {formatBytes(item.size)}
                    {item.width ? ` · ${item.width}×${item.height}` : ""}
                  </p>
                </div>
              ))}
            </div>

            <Pagination
              page={list.page}
              limit={list.limit}
              total={list.total}
              totalPages={list.totalPages}
              onPageChange={list.setPage}
              onLimitChange={list.setLimit}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="break-all">{viewing?.filename}</DialogTitle>
            <DialogDescription>
              {viewing ? formatBytes(viewing.size) : ""}
              {viewing?.width ? ` · ${viewing.width}×${viewing.height}px` : ""}
              {viewing?.mimeType ? ` · ${viewing.mimeType}` : ""}
            </DialogDescription>
          </DialogHeader>

          {viewing ? (
            <div className="space-y-4">
              <div className="relative aspect-video overflow-hidden rounded-lg border border-[var(--border)] bg-white">
                <Image
                  src={viewing.url}
                  alt={viewing.alt || viewing.filename}
                  fill
                  sizes="640px"
                  className="object-contain p-3"
                  unoptimized
                />
              </div>

              <Field label="Public URL">
                <div className="flex gap-2">
                  <Input readOnly value={viewing.url} className="font-mono text-xs" />
                  <Button type="button" variant="outline" onClick={() => copyUrl(viewing.url)}>
                    <Copy />
                  </Button>
                </div>
              </Field>

              <Field label="Alt text" hint="Describes the image for screen readers and search engines">
                <Input value={altDraft} onChange={(event) => setAltDraft(event.target.value)} />
              </Field>

              <p className="text-xs text-[var(--muted-foreground)]">
                {references === null
                  ? "Checking usage…"
                  : references === 0
                    ? "Not used by any record."
                    : `Used by ${references} record(s).`}
                {viewing.folder ? ` · folder: ${viewing.folder}` : ""}
              </p>
            </div>
          ) : null}

          <DialogFooter>
            {canDelete && viewing ? (
              <Button
                type="button"
                variant="destructive"
                className="mr-auto"
                onClick={() => setDeleting(viewing)}
              >
                <Trash2 />
                Delete
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => setViewing(null)}>
              Close
            </Button>
            {canUpload ? (
              <Button type="button" onClick={() => void saveAlt()}>
                Save
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this image?"
        description={`"${deleting?.filename}" will be removed from Cloudflare R2 permanently. Records still using it will show a broken image.`}
        confirmLabel="Delete image"
        destructive
        loading={busy}
        onConfirm={() => void handleDelete(false)}
      />
    </div>
  );
}
