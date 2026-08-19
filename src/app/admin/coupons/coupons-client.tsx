"use client";

import { useState } from "react";
import { BadgeCheck, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { couponSchema } from "@/lib/validations/marketing";
import { useResourceList } from "@/hooks/use-resource-list";
import { useOptions } from "@/hooks/use-options";
import { hasPermission } from "@/lib/permissions";
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

type CouponInput = z.input<typeof couponSchema>;
type CouponValues = z.output<typeof couponSchema>;

type CouponRow = {
  _id: string;
  code: string;
  title: string;
  description: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  minimumOrderValue: number;
  maximumDiscount: number;
  startDate: string;
  expiryDate: string;
  affiliateUrl: string;
  isVerified: boolean;
  usageCount: number;
  status: string;
  affiliateNetwork?: { _id: string; name: string } | null;
};

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

const EMPTY: CouponInput = {
  code: "",
  title: "",
  description: "",
  affiliateNetwork: null,
  category: null,
  discountType: "percentage",
  discountValue: 0,
  minimumOrderValue: 0,
  maximumDiscount: 0,
  startDate: toDateInput(new Date().toISOString()),
  expiryDate: toDateInput(new Date(Date.now() + 30 * 86_400_000).toISOString()),
  affiliateUrl: "",
  isVerified: false,
  status: "active",
};

export function CouponsClient({ session }: { session: AdminSession }) {
  const list = useResourceList<CouponRow>("/api/admin/coupons");
  const networks = useOptions("affiliate-networks");

  const [editing, setEditing] = useState<CouponRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CouponRow | null>(null);
  const [busy, setBusy] = useState(false);

  const canCreate = hasPermission(session, "coupons.create");
  const canEdit = hasPermission(session, "coupons.edit");
  const canDelete = hasPermission(session, "coupons.delete");

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiClient.delete(`/api/admin/coupons/${deleting._id}`);
      toast.success(`Deleted "${deleting.code}"`);
      setDeleting(null);
      await list.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the coupon");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<CouponRow>[] = [
    {
      key: "code",
      header: "Code",
      sortKey: "code",
      render: (row) => (
        <div className="flex items-center gap-2">
          <code className="rounded bg-[var(--muted)] px-2 py-1 text-xs font-semibold">{row.code}</code>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(row.code);
              toast.success("Code copied");
            }}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            aria-label="Copy coupon code"
          >
            <Copy className="size-3.5" />
          </button>
          {row.isVerified ? <BadgeCheck className="size-4 text-[var(--success)]" /> : null}
        </div>
      ),
    },
    {
      key: "title",
      header: "Offer",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.title}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {row.affiliateNetwork?.name ?? "Any network"}
          </p>
        </div>
      ),
    },
    {
      key: "discount",
      header: "Discount",
      render: (row) => (
        <Badge variant="success">
          {row.discountType === "percentage"
            ? `${row.discountValue}% off`
            : `${formatCurrency(row.discountValue)} off`}
        </Badge>
      ),
    },
    {
      key: "minimum",
      header: "Min. order",
      render: (row) => (row.minimumOrderValue ? formatCurrency(row.minimumOrderValue) : "—"),
    },
    {
      key: "expiry",
      header: "Expires",
      sortKey: "expiryDate",
      render: (row) => (
        <span className="text-xs text-[var(--muted-foreground)]">{formatDate(row.expiryDate)}</span>
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
            <Button variant="ghost" size="icon" onClick={() => setEditing(row)} aria-label="Edit coupon">
              <Pencil />
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="ghost" size="icon" onClick={() => setDeleting(row)} aria-label="Delete coupon">
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
        title="Coupons"
        description="Discount codes surfaced alongside your deals and products."
        actions={
          canCreate ? (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              Add coupon
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
        searchPlaceholder="Search by code or title…"
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
              value={list.filters.affiliateNetwork as string}
              onChange={(value) => list.setFilter("affiliateNetwork", value)}
              placeholder="All networks"
              options={networks.options}
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
        emptyTitle="No coupons yet"
        emptyDescription="Add the codes your affiliate partners are running."
      />

      <ResourceDialog<CouponInput, CouponValues>
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
        title={editing ? "Edit coupon" : "Add coupon"}
        endpoint="/api/admin/coupons"
        recordId={editing?._id}
        schema={couponSchema}
        defaultValues={EMPTY}
        className="max-w-xl"
        values={
          editing
            ? {
                code: editing.code,
                title: editing.title,
                description: editing.description ?? "",
                affiliateNetwork: editing.affiliateNetwork?._id ?? null,
                category: null,
                discountType: editing.discountType,
                discountValue: editing.discountValue,
                minimumOrderValue: editing.minimumOrderValue,
                maximumDiscount: editing.maximumDiscount,
                startDate: toDateInput(editing.startDate),
                expiryDate: toDateInput(editing.expiryDate),
                affiliateUrl: editing.affiliateUrl ?? "",
                isVerified: editing.isVerified,
                status: editing.status as CouponInput["status"],
              }
            : null
        }
      >
        {({ register, watch, setValue, formState: { errors } }) => (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Coupon code" htmlFor="couponCode" error={errors.code?.message} required>
                <Input id="couponCode" className="uppercase" {...register("code")} />
              </Field>
              <Field
                label="Affiliate network"
                htmlFor="couponNetwork"
                error={errors.affiliateNetwork?.message}
              >
                <NativeSelect id="couponNetwork" {...register("affiliateNetwork")}>
                  <option value="">Any network</option>
                  {networks.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <Field label="Title" htmlFor="couponTitle" error={errors.title?.message} required>
              <Input id="couponTitle" {...register("title")} />
            </Field>

            <Field label="Description" htmlFor="couponDescription" error={errors.description?.message}>
              <Textarea id="couponDescription" rows={2} {...register("description")} />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Discount type" htmlFor="couponType" error={errors.discountType?.message}>
                <NativeSelect id="couponType" {...register("discountType")}>
                  <option value="percentage">Percentage</option>
                  <option value="flat">Flat amount</option>
                </NativeSelect>
              </Field>
              <Field label="Discount value" htmlFor="couponValue" error={errors.discountValue?.message}>
                <Input id="couponValue" type="number" min={0} step="0.01" {...register("discountValue")} />
              </Field>
              <Field
                label="Minimum order value"
                htmlFor="couponMinimum"
                error={errors.minimumOrderValue?.message}
              >
                <Input id="couponMinimum" type="number" min={0} {...register("minimumOrderValue")} />
              </Field>
              <Field
                label="Maximum discount"
                htmlFor="couponMaximum"
                error={errors.maximumDiscount?.message}
              >
                <Input id="couponMaximum" type="number" min={0} {...register("maximumDiscount")} />
              </Field>
              <Field label="Starts" htmlFor="couponStart" error={errors.startDate?.message} required>
                <Input id="couponStart" type="date" {...register("startDate")} />
              </Field>
              <Field label="Expires" htmlFor="couponExpiry" error={errors.expiryDate?.message} required>
                <Input id="couponExpiry" type="date" {...register("expiryDate")} />
              </Field>
            </div>

            <Field label="Affiliate URL" htmlFor="couponUrl" error={errors.affiliateUrl?.message}>
              <Input id="couponUrl" placeholder="https://" {...register("affiliateUrl")} />
            </Field>

            <Field label="Status" htmlFor="couponStatus" error={errors.status?.message}>
              <NativeSelect id="couponStatus" {...register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </NativeSelect>
            </Field>

            <ToggleRow
              label="Verified"
              description="Show a verified badge on the storefront"
              checked={Boolean(watch("isVerified"))}
              onCheckedChange={(value) => setValue("isVerified", value)}
            />
          </>
        )}
      </ResourceDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this coupon?"
        description={`"${deleting?.code}" will stop appearing on the storefront.`}
        confirmLabel="Delete coupon"
        destructive
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
