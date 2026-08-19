"use client";

import { useState } from "react";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { brandSchema } from "@/lib/validations/catalogue";
import { useResourceList } from "@/hooks/use-resource-list";
import { hasPermission } from "@/lib/permissions";
import { slugify } from "@/lib/utils/slug";
import { formatDate } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResourceDialog } from "@/components/forms/resource-dialog";
import { DataTable, FilterSelect, RowActions, type Column } from "@/components/tables/data-table";
import type { AdminSession } from "@/types";

type BrandInput = z.input<typeof brandSchema>;
type BrandValues = z.output<typeof brandSchema>;

type BrandRow = {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  website: string;
  status: "active" | "inactive";
  createdAt: string;
  seo?: { title: string; description: string; keywords: string[] };
};

const EMPTY: BrandInput = {
  name: "",
  slug: "",
  logo: "",
  description: "",
  website: "",
  status: "active",
  seo: { title: "", description: "", keywords: [] },
};

export function BrandsClient({ session }: { session: AdminSession }) {
  const list = useResourceList<BrandRow>("/api/admin/brands");
  const [editing, setEditing] = useState<BrandRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<BrandRow | null>(null);
  const [busy, setBusy] = useState(false);

  const canCreate = hasPermission(session, "brands.create");
  const canEdit = hasPermission(session, "brands.edit");
  const canDelete = hasPermission(session, "brands.delete");

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiClient.delete(`/api/admin/brands/${deleting._id}`);
      toast.success(`Deleted "${deleting.name}"`);
      setDeleting(null);
      await list.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the brand");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<BrandRow>[] = [
    {
      key: "name",
      header: "Brand",
      sortKey: "name",
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-[var(--muted-foreground)]">/{row.slug}</p>
        </div>
      ),
    },
    {
      key: "website",
      header: "Website",
      render: (row) =>
        row.website ? (
          <a
            href={row.website}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:underline"
          >
            Visit
            <ExternalLink className="size-3.5" />
          </a>
        ) : (
          <span className="text-xs text-[var(--muted-foreground)]">—</span>
        ),
    },
    { key: "status", header: "Status", sortKey: "status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "createdAt",
      header: "Added",
      sortKey: "createdAt",
      render: (row) => (
        <span className="text-xs text-[var(--muted-foreground)]">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <RowActions>
          {canEdit ? (
            <Button variant="ghost" size="icon" onClick={() => setEditing(row)} aria-label="Edit brand">
              <Pencil />
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="ghost" size="icon" onClick={() => setDeleting(row)} aria-label="Delete brand">
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
        title="Brands"
        description="Manufacturers and labels used to filter the catalogue."
        actions={
          canCreate ? (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              Add brand
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
        searchPlaceholder="Search brands…"
        filters={
          <FilterSelect
            value={list.filters.status as string}
            onChange={(value) => list.setFilter("status", value)}
            placeholder="All statuses"
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
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
        emptyTitle="No brands yet"
        emptyDescription="Add the brands you sell so shoppers can filter by them."
      />

      <ResourceDialog<BrandInput, BrandValues>
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
        title={editing ? "Edit brand" : "Add brand"}
        endpoint="/api/admin/brands"
        recordId={editing?._id}
        schema={brandSchema}
        defaultValues={EMPTY}
        values={
          editing
            ? {
                name: editing.name,
                slug: editing.slug,
                logo: editing.logo ?? "",
                description: editing.description ?? "",
                website: editing.website ?? "",
                status: editing.status,
                seo: editing.seo ?? { title: "", description: "", keywords: [] },
              }
            : null
        }
      >
        {({ register, setValue, formState: { errors } }) => (
          <>
            <Field label="Brand name" htmlFor="brandName" error={errors.name?.message} required>
              <Input
                id="brandName"
                {...register("name")}
                onBlur={(event) => {
                  if (!editing) setValue("slug", slugify(event.target.value));
                }}
              />
            </Field>

            <Field label="Slug" htmlFor="brandSlug" error={errors.slug?.message} required>
              <Input id="brandSlug" {...register("slug")} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Logo URL" htmlFor="brandLogo" error={errors.logo?.message}>
                <Input id="brandLogo" placeholder="https://" {...register("logo")} />
              </Field>
              <Field label="Website" htmlFor="brandWebsite" error={errors.website?.message}>
                <Input id="brandWebsite" placeholder="https://" {...register("website")} />
              </Field>
            </div>

            <Field label="Description" htmlFor="brandDescription" error={errors.description?.message}>
              <Textarea id="brandDescription" rows={3} {...register("description")} />
            </Field>

            <Field label="Status" htmlFor="brandStatus" error={errors.status?.message}>
              <NativeSelect id="brandStatus" {...register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </NativeSelect>
            </Field>

            <Field label="SEO title" htmlFor="brandSeoTitle" error={errors.seo?.title?.message}>
              <Input id="brandSeoTitle" {...register("seo.title")} />
            </Field>

            <Field
              label="SEO description"
              htmlFor="brandSeoDescription"
              error={errors.seo?.description?.message}
            >
              <Textarea id="brandSeoDescription" rows={2} {...register("seo.description")} />
            </Field>
          </>
        )}
      </ResourceDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this brand?"
        description={`"${deleting?.name}" will be removed from the catalogue filters.`}
        confirmLabel="Delete brand"
        destructive
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
