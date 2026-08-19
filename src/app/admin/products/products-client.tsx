"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Copy, Package, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { useResourceList } from "@/hooks/use-resource-list";
import { useOptions } from "@/hooks/use-options";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, FilterSelect, RowActions, type Column } from "@/components/tables/data-table";
import type { AdminSession } from "@/types";

type ProductRow = {
  _id: string;
  name: string;
  slug: string;
  thumbnail: string;
  salePrice: number;
  originalPrice: number;
  discountPercentage: number;
  status: string;
  isFeatured: boolean;
  isTrending: boolean;
  clickCount: number;
  createdAt: string;
  category?: { name: string } | null;
  brand?: { name: string } | null;
};

export function ProductsClient({ session }: { session: AdminSession }) {
  const list = useResourceList<ProductRow>("/api/admin/products");
  const categories = useOptions("categories");
  const brands = useOptions("brands");

  const [selection, setSelection] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<ProductRow | null>(null);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canCreate = hasPermission(session, "products.create");
  const canEdit = hasPermission(session, "products.edit");
  const canDelete = hasPermission(session, "products.delete");

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiClient.delete(`/api/admin/products/${deleting._id}`);
      toast.success(`Deleted "${deleting.name}"`);
      setDeleting(null);
      await list.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the product");
    } finally {
      setBusy(false);
    }
  }

  async function runBulk(action: string) {
    setBusy(true);
    try {
      const result = await apiClient.post<{ affected: number }>("/api/admin/products/bulk", {
        ids: selection,
        action,
      });
      toast.success(`${result.affected} product(s) updated`);
      setSelection([]);
      setBulkAction(null);
      await list.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk action failed");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<ProductRow>[] = [
    {
      key: "name",
      header: "Product",
      sortKey: "name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-[var(--muted)]">
            {row.thumbnail ? (
              <Image src={row.thumbnail} alt="" fill sizes="40px" className="object-cover" unoptimized />
            ) : (
              <Package className="absolute inset-0 m-auto size-4 text-[var(--muted-foreground)]" />
            )}
          </span>
          <div className="min-w-0">
            <Link
              href={`/admin/products/${row._id}`}
              className="line-clamp-1 font-medium hover:text-[var(--primary)]"
            >
              {row.name}
            </Link>
            <p className="text-xs text-[var(--muted-foreground)]">
              {row.category?.name ?? "—"}
              {row.brand?.name ? ` · ${row.brand.name}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      sortKey: "salePrice",
      render: (row) => (
        <div>
          <p className="font-medium">{formatCurrency(row.salePrice)}</p>
          <p className="text-xs text-[var(--muted-foreground)] line-through">
            {formatCurrency(row.originalPrice)}
          </p>
        </div>
      ),
    },
    {
      key: "discount",
      header: "Discount",
      sortKey: "discountPercentage",
      render: (row) => <Badge variant="success">{row.discountPercentage}% off</Badge>,
    },
    {
      key: "clicks",
      header: "Clicks",
      sortKey: "clickCount",
      render: (row) => formatNumber(row.clickCount),
    },
    {
      key: "flags",
      header: "Flags",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.isFeatured ? <Badge variant="info">Featured</Badge> : null}
          {row.isTrending ? <Badge variant="warning">Trending</Badge> : null}
          {!row.isFeatured && !row.isTrending ? (
            <span className="text-xs text-[var(--muted-foreground)]">—</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortKey: "status",
      render: (row) => <StatusBadge status={row.status} />,
    },
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
            <Button asChild variant="ghost" size="icon" aria-label="Edit product">
              <Link href={`/admin/products/${row._id}`}>
                <Pencil />
              </Link>
            </Button>
          ) : null}
          {canCreate ? (
            <Button asChild variant="ghost" size="icon" aria-label="Duplicate product">
              <Link href={`/admin/products/new?duplicate=${row._id}`}>
                <Copy />
              </Link>
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete product"
              onClick={() => setDeleting(row)}
            >
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
        title="Products"
        description="Everything you list across Amazon, Flipkart and other affiliate networks."
        actions={
          <>
            {canCreate ? (
              <Button asChild variant="outline">
                <Link href="/admin/products/import">
                  <Upload />
                  Import CSV
                </Link>
              </Button>
            ) : null}
            {canCreate ? (
              <Button asChild>
                <Link href="/admin/products/new">
                  <Plus />
                  Add product
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      {selection.length > 0 && canEdit ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--accent)] px-4 py-2.5 text-sm">
          <span className="font-medium">{selection.length} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setBulkAction("activate")}>
              Activate
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkAction("deactivate")}>
              Deactivate
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkAction("feature")}>
              Feature
            </Button>
            {canDelete ? (
              <Button size="sm" variant="destructive" onClick={() => setBulkAction("delete")}>
                Delete
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => setSelection([])}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={list.items}
        loading={list.loading}
        error={list.error}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search by name, slug or SKU…"
        filters={
          <>
            <FilterSelect
              value={list.filters.status as string}
              onChange={(value) => list.setFilter("status", value)}
              placeholder="All statuses"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "draft", label: "Draft" },
              ]}
            />
            <FilterSelect
              value={list.filters.category as string}
              onChange={(value) => list.setFilter("category", value)}
              placeholder="All categories"
              options={categories.options}
            />
            <FilterSelect
              value={list.filters.brand as string}
              onChange={(value) => list.setFilter("brand", value)}
              placeholder="All brands"
              options={brands.options}
            />
          </>
        }
        sort={list.sort}
        order={list.order}
        onSort={list.toggleSort}
        selection={canEdit ? selection : undefined}
        onSelectionChange={canEdit ? setSelection : undefined}
        page={list.page}
        limit={list.limit}
        total={list.total}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        emptyTitle="No products found"
        emptyDescription="Adjust your filters, or add your first product to get started."
        emptyAction={
          canCreate ? (
            <Button asChild>
              <Link href="/admin/products/new">
                <Plus />
                Add product
              </Link>
            </Button>
          ) : undefined
        }
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this product?"
        description={`"${deleting?.name}" and its price history will be permanently removed.`}
        confirmLabel="Delete product"
        destructive
        loading={busy}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={Boolean(bulkAction)}
        onOpenChange={(open) => !open && setBulkAction(null)}
        title={`Apply "${bulkAction}" to ${selection.length} product(s)?`}
        description={
          bulkAction === "delete"
            ? "This permanently deletes the selected products."
            : "This updates the selected products immediately."
        }
        confirmLabel="Confirm"
        destructive={bulkAction === "delete"}
        loading={busy}
        onConfirm={() => {
          if (bulkAction) void runBulk(bulkAction);
        }}
      />
    </div>
  );
}
