"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { bannerSchema } from "@/lib/validations/marketing";
import { useResourceList } from "@/hooks/use-resource-list";
import { hasPermission } from "@/lib/permissions";
import { formatDate } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResourceDialog } from "@/components/forms/resource-dialog";
import { DataTable, FilterSelect, RowActions, type Column } from "@/components/tables/data-table";
import type { AdminSession } from "@/types";

type BannerInput = z.input<typeof bannerSchema>;
type BannerValues = z.output<typeof bannerSchema>;

type BannerRow = {
  _id: string;
  title: string;
  subtitle: string;
  desktopImage: string;
  mobileImage: string;
  ctaText: string;
  ctaUrl: string;
  position: string;
  priority: number;
  startDate: string | null;
  endDate: string | null;
  status: "active" | "inactive";
};

const POSITIONS = [
  { value: "home-hero", label: "Home hero" },
  { value: "home-middle", label: "Home middle" },
  { value: "category-top", label: "Category top" },
  { value: "sidebar", label: "Sidebar" },
  { value: "footer", label: "Footer" },
];

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

const EMPTY: BannerInput = {
  title: "",
  subtitle: "",
  desktopImage: "",
  mobileImage: "",
  ctaText: "",
  ctaUrl: "",
  position: "home-hero",
  priority: 0,
  startDate: null,
  endDate: null,
  status: "active",
};

export function BannersClient({ session }: { session: AdminSession }) {
  const list = useResourceList<BannerRow>("/api/admin/banners");
  const [editing, setEditing] = useState<BannerRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<BannerRow | null>(null);
  const [busy, setBusy] = useState(false);

  const canCreate = hasPermission(session, "banners.create");
  const canEdit = hasPermission(session, "banners.edit");
  const canDelete = hasPermission(session, "banners.delete");

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiClient.delete(`/api/admin/banners/${deleting._id}`);
      toast.success(`Deleted "${deleting.title}"`);
      setDeleting(null);
      await list.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the banner");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<BannerRow>[] = [
    {
      key: "title",
      header: "Banner",
      sortKey: "title",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md bg-[var(--muted)]">
            {row.desktopImage ? (
              <Image src={row.desktopImage} alt="" fill sizes="64px" className="object-cover" unoptimized />
            ) : (
              <ImageIcon className="absolute inset-0 m-auto size-4 text-[var(--muted-foreground)]" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{row.title}</p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">{row.subtitle || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "position",
      header: "Position",
      sortKey: "position",
      render: (row) => (
        <Badge variant="navy">
          {POSITIONS.find((position) => position.value === row.position)?.label ?? row.position}
        </Badge>
      ),
    },
    { key: "priority", header: "Priority", sortKey: "priority", render: (row) => row.priority },
    {
      key: "schedule",
      header: "Schedule",
      render: (row) => (
        <span className="text-xs text-[var(--muted-foreground)]">
          {row.startDate ? formatDate(row.startDate) : "Always"} →{" "}
          {row.endDate ? formatDate(row.endDate) : "No end"}
        </span>
      ),
    },
    { key: "status", header: "Status", sortKey: "status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <RowActions>
          {canEdit ? (
            <Button variant="ghost" size="icon" onClick={() => setEditing(row)} aria-label="Edit banner">
              <Pencil />
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="ghost" size="icon" onClick={() => setDeleting(row)} aria-label="Delete banner">
              <Trash2 className="text-[var(--destructive)]" />
            </Button>
          ) : null}
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Banners"
        description="Promotional slots across the storefront, with separate desktop and mobile art."
        actions={
          canCreate ? (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              Add banner
            </Button>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        rows={list.items}
        loading={list.loading}
        error={list.error}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search banners…"
        filters={
          <>
            <FilterSelect
              value={list.filters.position as string}
              onChange={(value) => list.setFilter("position", value)}
              placeholder="All positions"
              options={POSITIONS}
            />
            <FilterSelect
              value={list.filters.status as string}
              onChange={(value) => list.setFilter("status", value)}
              placeholder="All statuses"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </>
        }
        sort={list.sort}
        order={list.order}
        onSort={list.toggleSort}
        page={list.page}
        limit={list.limit}
        total={list.total}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        emptyTitle="No banners yet"
        emptyDescription="Banners drive your homepage campaigns."
      />

      <ResourceDialog<BannerInput, BannerValues>
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={async () => {
          setCreating(false);
          setEditing(null);
          await list.refresh();
        }}
        title={editing ? "Edit banner" : "Add banner"}
        endpoint="/api/admin/banners"
        recordId={editing?._id}
        schema={bannerSchema}
        defaultValues={EMPTY}
        className="max-w-xl"
        values={
          editing
            ? {
                title: editing.title,
                subtitle: editing.subtitle ?? "",
                desktopImage: editing.desktopImage ?? "",
                mobileImage: editing.mobileImage ?? "",
                ctaText: editing.ctaText ?? "",
                ctaUrl: editing.ctaUrl ?? "",
                position: editing.position as BannerInput["position"],
                priority: editing.priority,
                startDate: toDateInput(editing.startDate),
                endDate: toDateInput(editing.endDate),
                status: editing.status,
              }
            : null
        }
      >
        {({ register, formState: { errors } }) => (
          <>
            <Field label="Title" htmlFor="bannerTitle" error={errors.title?.message} required>
              <Input id="bannerTitle" {...register("title")} />
            </Field>

            <Field label="Subtitle" htmlFor="bannerSubtitle" error={errors.subtitle?.message}>
              <Input id="bannerSubtitle" {...register("subtitle")} />
            </Field>

            <Field label="Desktop image URL" htmlFor="bannerDesktop" error={errors.desktopImage?.message}>
              <Input id="bannerDesktop" placeholder="https://" {...register("desktopImage")} />
            </Field>

            <Field label="Mobile image URL" htmlFor="bannerMobile" error={errors.mobileImage?.message}>
              <Input id="bannerMobile" placeholder="https://" {...register("mobileImage")} />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="CTA text" htmlFor="bannerCtaText" error={errors.ctaText?.message}>
                <Input id="bannerCtaText" placeholder="Shop now" {...register("ctaText")} />
              </Field>
              <Field label="CTA URL" htmlFor="bannerCtaUrl" error={errors.ctaUrl?.message}>
                <Input id="bannerCtaUrl" placeholder="https://" {...register("ctaUrl")} />
              </Field>
              <Field label="Position" htmlFor="bannerPosition" error={errors.position?.message}>
                <NativeSelect id="bannerPosition" {...register("position")}>
                  {POSITIONS.map((position) => (
                    <option key={position.value} value={position.value}>
                      {position.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field
                label="Priority"
                htmlFor="bannerPriority"
                hint="Higher shows first"
                error={errors.priority?.message}
              >
                <Input id="bannerPriority" type="number" min={0} {...register("priority")} />
              </Field>
              <Field label="Start date" htmlFor="bannerStart" error={errors.startDate?.message}>
                <Input id="bannerStart" type="date" {...register("startDate")} />
              </Field>
              <Field label="End date" htmlFor="bannerEnd" error={errors.endDate?.message}>
                <Input id="bannerEnd" type="date" {...register("endDate")} />
              </Field>
            </div>

            <Field label="Status" htmlFor="bannerStatus" error={errors.status?.message}>
              <NativeSelect id="bannerStatus" {...register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </NativeSelect>
            </Field>
          </>
        )}
      </ResourceDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this banner?"
        description={`"${deleting?.title}" will be removed from the storefront.`}
        confirmLabel="Delete banner"
        destructive
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
