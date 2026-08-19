"use client";

import { useState } from "react";
import { Check, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { useResourceList } from "@/hooks/use-resource-list";
import { hasPermission } from "@/lib/permissions";
import { formatDate } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, FilterSelect, RowActions, type Column } from "@/components/tables/data-table";
import type { AdminSession } from "@/types";

type ReviewRow = {
  _id: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  source: string;
  status: string;
  createdAt: string;
  product?: { _id: string; name: string } | null;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={
            index < rating
              ? "size-3.5 fill-[var(--primary)] text-[var(--primary)]"
              : "size-3.5 text-[var(--border)]"
          }
        />
      ))}
    </span>
  );
}

export function ReviewsClient({ session }: { session: AdminSession }) {
  const list = useResourceList<ReviewRow>("/api/admin/reviews");
  const [deleting, setDeleting] = useState<ReviewRow | null>(null);
  const [busy, setBusy] = useState(false);

  const canModerate = hasPermission(session, "products.edit");
  const canDelete = hasPermission(session, "products.delete");

  async function moderate(review: ReviewRow, status: "approved" | "rejected") {
    try {
      await apiClient.put(`/api/admin/reviews/${review._id}`, {
        product: review.product?._id,
        authorName: review.authorName,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        images: [],
        source: review.source,
        status,
      });
      toast.success(`Review ${status}`);
      await list.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the review");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiClient.delete(`/api/admin/reviews/${deleting._id}`);
      toast.success("Review deleted");
      setDeleting(null);
      await list.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the review");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<ReviewRow>[] = [
    {
      key: "review",
      header: "Review",
      render: (row) => (
        <div className="min-w-0 max-w-md">
          <div className="flex items-center gap-2">
            <Stars rating={row.rating} />
            <span className="truncate text-sm font-medium">{row.title || "Untitled"}</span>
          </div>
          <p className="line-clamp-2 text-xs text-[var(--muted-foreground)]">{row.comment}</p>
        </div>
      ),
    },
    {
      key: "product",
      header: "Product",
      render: (row) => (
        <span className="line-clamp-1 text-sm">{row.product?.name ?? "Deleted product"}</span>
      ),
    },
    {
      key: "author",
      header: "Author",
      render: (row) => (
        <div>
          <p className="text-sm">{row.authorName || "Anonymous"}</p>
          <p className="text-xs capitalize text-[var(--muted-foreground)]">{row.source}</p>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Received",
      sortKey: "createdAt",
      render: (row) => (
        <span className="text-xs text-[var(--muted-foreground)]">{formatDate(row.createdAt)}</span>
      ),
    },
    { key: "status", header: "Status", sortKey: "status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <RowActions>
          {canModerate && row.status !== "approved" ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Approve review"
              onClick={() => void moderate(row, "approved")}
            >
              <Check className="text-[var(--success)]" />
            </Button>
          ) : null}
          {canModerate && row.status !== "rejected" ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Reject review"
              onClick={() => void moderate(row, "rejected")}
            >
              <X className="text-[var(--warning)]" />
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="ghost" size="icon" aria-label="Delete review" onClick={() => setDeleting(row)}>
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
        title="Product reviews"
        description="Moderate reviews before they appear on the storefront."
      />

      <DataTable
        columns={columns}
        rows={list.items}
        loading={list.loading}
        error={list.error}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search reviews…"
        filters={
          <>
            <FilterSelect
              value={list.filters.status as string}
              onChange={(value) => list.setFilter("status", value)}
              placeholder="All statuses"
              options={[
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
            <FilterSelect
              value={list.filters.rating as string}
              onChange={(value) => list.setFilter("rating", value)}
              placeholder="All ratings"
              options={[5, 4, 3, 2, 1].map((rating) => ({
                value: String(rating),
                label: `${rating} star${rating > 1 ? "s" : ""}`,
              }))}
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
        emptyTitle="No reviews yet"
        emptyDescription="Reviews submitted on the storefront land here for moderation."
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this review?"
        description="The review will be permanently removed."
        confirmLabel="Delete review"
        destructive
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
