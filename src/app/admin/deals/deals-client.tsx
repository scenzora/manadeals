"use client";

import { useState } from "react";
import { Flame, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { dealSchema } from "@/lib/validations/marketing";
import { useResourceList } from "@/hooks/use-resource-list";
import { useOptions } from "@/hooks/use-options";
import { hasPermission } from "@/lib/permissions";
import { slugify } from "@/lib/utils/slug";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, ToggleRow } from "@/components/ui/form-field";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResourceDialog } from "@/components/forms/resource-dialog";
import { DataTable, FilterSelect, RowActions, type Column } from "@/components/tables/data-table";
import type { AdminSession } from "@/types";

type DealInput = z.input<typeof dealSchema>;
type DealValues = z.output<typeof dealSchema>;

type DealRow = {
  _id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  dealType: string;
  originalPrice: number;
  dealPrice: number;
  discountPercentage: number;
  couponCode: string;
  affiliateUrl: string;
  startDate: string;
  endDate: string;
  isFeatured: boolean;
  status: string;
  product?: { _id: string; name: string } | null;
  affiliateNetwork?: { _id: string; name: string } | null;
};

/** Formats an ISO date for a `datetime-local` input. */
function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const now = new Date();
const inAWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const EMPTY: DealInput = {
  title: "",
  slug: "",
  description: "",
  image: "",
  product: null,
  category: null,
  affiliateNetwork: null,
  dealType: "standard",
  originalPrice: 0,
  dealPrice: 0,
  couponCode: "",
  affiliateUrl: "",
  startDate: toLocalInput(now.toISOString()),
  endDate: toLocalInput(inAWeek.toISOString()),
  isFeatured: false,
  status: "active",
};

export function DealsClient({ session }: { session: AdminSession }) {
  const list = useResourceList<DealRow>("/api/admin/deals");
  const products = useOptions("products");
  const networks = useOptions("affiliate-networks");

  const [editing, setEditing] = useState<DealRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<DealRow | null>(null);
  const [busy, setBusy] = useState(false);

  const canCreate = hasPermission(session, "deals.create");
  const canEdit = hasPermission(session, "deals.edit");
  const canDelete = hasPermission(session, "deals.delete");

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiClient.delete(`/api/admin/deals/${deleting._id}`);
      toast.success(`Deleted "${deleting.title}"`);
      setDeleting(null);
      await list.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the deal");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<DealRow>[] = [
    {
      key: "title",
      header: "Deal",
      sortKey: "title",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.title}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {row.product?.name ?? "No product linked"}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortKey: "dealType",
      render: (row) => (
        <Badge variant={row.dealType === "flash" ? "warning" : "navy"} className="capitalize">
          {row.dealType.replace(/-/g, " ")}
        </Badge>
      ),
    },
    {
      key: "price",
      header: "Price",
      render: (row) => (
        <div>
          <p className="font-medium">{formatCurrency(row.dealPrice)}</p>
          <p className="text-xs text-[var(--muted-foreground)] line-through">
            {formatCurrency(row.originalPrice)}
          </p>
        </div>
      ),
    },
    {
      key: "window",
      header: "Runs",
      sortKey: "endDate",
      render: (row) => (
        <span className="text-xs text-[var(--muted-foreground)]">
          {formatDate(row.startDate)} → {formatDate(row.endDate)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortKey: "status",
      render: (row) => {
        const expired = new Date(row.endDate) < new Date();
        return <StatusBadge status={expired ? "expired" : row.status} />;
      },
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <RowActions>
          {canEdit ? (
            <Button variant="ghost" size="icon" onClick={() => setEditing(row)} aria-label="Edit deal">
              <Pencil />
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="ghost" size="icon" onClick={() => setDeleting(row)} aria-label="Delete deal">
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
        title="Deals &amp; offers"
        description="Scheduled campaigns, flash sales and the deal of the day."
        actions={
          canCreate ? (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              Create deal
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
        searchPlaceholder="Search deals…"
        filters={
          <>
            <FilterSelect
              value={list.filters.status as string}
              onChange={(value) => list.setFilter("status", value)}
              placeholder="All statuses"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "expired", label: "Expired" },
              ]}
            />
            <FilterSelect
              value={list.filters.dealType as string}
              onChange={(value) => list.setFilter("dealType", value)}
              placeholder="All types"
              options={[
                { value: "standard", label: "Standard" },
                { value: "flash", label: "Flash" },
                { value: "deal-of-the-day", label: "Deal of the day" },
                { value: "featured", label: "Featured" },
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
        emptyTitle="No deals scheduled"
        emptyDescription="Create a deal to promote a product for a limited time."
        emptyAction={
          canCreate ? (
            <Button onClick={() => setCreating(true)}>
              <Flame />
              Create deal
            </Button>
          ) : undefined
        }
      />

      <ResourceDialog<DealInput, DealValues>
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
        title={editing ? "Edit deal" : "Create deal"}
        endpoint="/api/admin/deals"
        recordId={editing?._id}
        schema={dealSchema}
        defaultValues={EMPTY}
        className="max-w-2xl"
        values={
          editing
            ? {
                title: editing.title,
                slug: editing.slug,
                description: editing.description ?? "",
                image: editing.image ?? "",
                product: editing.product?._id ?? null,
                category: null,
                affiliateNetwork: editing.affiliateNetwork?._id ?? null,
                dealType: editing.dealType as DealInput["dealType"],
                originalPrice: editing.originalPrice,
                dealPrice: editing.dealPrice,
                couponCode: editing.couponCode ?? "",
                affiliateUrl: editing.affiliateUrl ?? "",
                startDate: toLocalInput(editing.startDate),
                endDate: toLocalInput(editing.endDate),
                isFeatured: editing.isFeatured,
                status: editing.status as DealInput["status"],
              }
            : null
        }
      >
        {({ register, watch, setValue, formState: { errors } }) => (
          <>
            <Field label="Title" htmlFor="dealTitle" error={errors.title?.message} required>
              <Input
                id="dealTitle"
                {...register("title")}
                onBlur={(event) => {
                  if (!editing) setValue("slug", slugify(event.target.value));
                }}
              />
            </Field>

            <Field label="Slug" htmlFor="dealSlug" error={errors.slug?.message} required>
              <Input id="dealSlug" {...register("slug")} />
            </Field>

            <Field label="Description" htmlFor="dealDescription" error={errors.description?.message}>
              <Textarea id="dealDescription" rows={2} {...register("description")} />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Product" htmlFor="dealProduct" error={errors.product?.message}>
                <NativeSelect id="dealProduct" {...register("product")}>
                  <option value="">None</option>
                  {products.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field
                label="Affiliate network"
                htmlFor="dealNetwork"
                error={errors.affiliateNetwork?.message}
              >
                <NativeSelect id="dealNetwork" {...register("affiliateNetwork")}>
                  <option value="">None</option>
                  {networks.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Deal type" htmlFor="dealType" error={errors.dealType?.message}>
                <NativeSelect id="dealType" {...register("dealType")}>
                  <option value="standard">Standard</option>
                  <option value="flash">Flash</option>
                  <option value="deal-of-the-day">Deal of the day</option>
                  <option value="featured">Featured</option>
                </NativeSelect>
              </Field>

              <Field label="Status" htmlFor="dealStatus" error={errors.status?.message}>
                <NativeSelect id="dealStatus" {...register("status")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
                </NativeSelect>
              </Field>

              <Field label="Original price" htmlFor="dealOriginal" error={errors.originalPrice?.message}>
                <Input id="dealOriginal" type="number" min={0} step="0.01" {...register("originalPrice")} />
              </Field>

              <Field label="Deal price" htmlFor="dealPrice" error={errors.dealPrice?.message}>
                <Input id="dealPrice" type="number" min={0} step="0.01" {...register("dealPrice")} />
              </Field>

              <Field label="Starts" htmlFor="dealStart" error={errors.startDate?.message} required>
                <Input id="dealStart" type="datetime-local" {...register("startDate")} />
              </Field>

              <Field label="Ends" htmlFor="dealEnd" error={errors.endDate?.message} required>
                <Input id="dealEnd" type="datetime-local" {...register("endDate")} />
              </Field>

              <Field label="Coupon code" htmlFor="dealCoupon" error={errors.couponCode?.message}>
                <Input id="dealCoupon" {...register("couponCode")} />
              </Field>

              <Field label="Image URL" htmlFor="dealImage" error={errors.image?.message}>
                <Input id="dealImage" placeholder="https://" {...register("image")} />
              </Field>
            </div>

            <Field label="Affiliate URL" htmlFor="dealUrl" error={errors.affiliateUrl?.message}>
              <Input id="dealUrl" placeholder="https://" {...register("affiliateUrl")} />
            </Field>

            <ToggleRow
              label="Featured deal"
              description="Pin to the top of the deals page"
              checked={Boolean(watch("isFeatured"))}
              onCheckedChange={(value) => setValue("isFeatured", value)}
            />
          </>
        )}
      </ResourceDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this deal?"
        description={`"${deleting?.title}" will be removed from the storefront.`}
        confirmLabel="Delete deal"
        destructive
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
