"use client";

import { useState } from "react";
import { Eye, Trash2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { useResourceList } from "@/hooks/use-resource-list";
import { hasPermission } from "@/lib/permissions";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, FilterSelect, RowActions, type Column } from "@/components/tables/data-table";
import { EmptyState, Skeleton } from "@/components/ui/states";
import type { AdminSession } from "@/types";

type UserRow = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "blocked";
  createdAt: string;
  lastLoginAt: string | null;
  clickCount: number;
};

type UserDetail = {
  user: UserRow & { favorites: { _id: string; name: string; salePrice: number }[] };
  clicks: {
    _id: string;
    clickedAt: string;
    product?: { name: string } | null;
    affiliateNetwork?: { name: string } | null;
    device: string;
  }[];
};

export function UsersClient({ session }: { session: AdminSession }) {
  const list = useResourceList<UserRow>("/api/admin/users");
  const [viewing, setViewing] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [busy, setBusy] = useState(false);

  const canEdit = hasPermission(session, "users.edit");
  const canDelete = hasPermission(session, "users.delete");

  async function openDetail(user: UserRow) {
    setLoadingDetail(true);
    try {
      const detail = await apiClient.get<UserDetail>(`/api/admin/users/${user._id}`);
      setViewing(detail);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load the user");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function toggleStatus(user: UserRow) {
    const status = user.status === "active" ? "inactive" : "active";
    try {
      await apiClient.put(`/api/admin/users/${user._id}`, { status });
      toast.success(status === "active" ? "User activated" : "User deactivated");
      await list.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the user");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiClient.delete(`/api/admin/users/${deleting._id}`);
      toast.success("User deleted");
      setDeleting(null);
      await list.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the user");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<UserRow>[] = [
    {
      key: "name",
      header: "User",
      sortKey: "name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-semibold">
            {row.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{row.name}</p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "registered",
      header: "Registered",
      sortKey: "createdAt",
      render: (row) => (
        <span className="text-xs text-[var(--muted-foreground)]">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: "lastLogin",
      header: "Last login",
      sortKey: "lastLoginAt",
      render: (row) => (
        <span className="text-xs text-[var(--muted-foreground)]">
          {row.lastLoginAt ? formatDate(row.lastLoginAt) : "Never"}
        </span>
      ),
    },
    { key: "clicks", header: "Clicks", sortKey: "clickCount", render: (row) => formatNumber(row.clickCount) },
    { key: "status", header: "Status", sortKey: "status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <RowActions>
          <Button
            variant="ghost"
            size="icon"
            aria-label="View user"
            onClick={() => void openDetail(row)}
            disabled={loadingDetail}
          >
            <Eye />
          </Button>
          {canEdit ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={row.status === "active" ? "Deactivate user" : "Activate user"}
              onClick={() => void toggleStatus(row)}
            >
              {row.status === "active" ? (
                <UserX className="text-[var(--warning)]" />
              ) : (
                <UserCheck className="text-[var(--success)]" />
              )}
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="ghost" size="icon" aria-label="Delete user" onClick={() => setDeleting(row)}>
              <Trash2 className="text-[var(--destructive)]" />
            </Button>
          ) : null}
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Users" description="People who registered on ManaDeals.online." />

      <DataTable
        columns={columns}
        rows={list.items}
        loading={list.loading}
        error={list.error}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search by name, email or phone…"
        filters={
          <FilterSelect
            value={list.filters.status as string}
            onChange={(value) => list.setFilter("status", value)}
            placeholder="All statuses"
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "blocked", label: "Blocked" },
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
        emptyTitle="No users yet"
        emptyDescription="Registered shoppers will appear here."
      />

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewing?.user.name}</DialogTitle>
            <DialogDescription>
              {viewing?.user.email} · joined {viewing ? formatDate(viewing.user.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <Skeleton className="h-40 w-full" />
          ) : viewing ? (
            <div className="space-y-5">
              <div>
                <h3 className="mb-2 text-sm font-semibold">Favourite products</h3>
                {viewing.user.favorites?.length ? (
                  <ul className="space-y-1 text-sm">
                    {viewing.user.favorites.map((product) => (
                      <li key={product._id} className="rounded-md bg-[var(--muted)] px-3 py-2">
                        {product.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">No favourites yet.</p>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Recent affiliate clicks</h3>
                {viewing.clicks.length ? (
                  <ul className="space-y-1 text-sm">
                    {viewing.clicks.map((click) => (
                      <li
                        key={click._id}
                        className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] px-3 py-2"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {click.product?.name ?? "Deleted product"}
                        </span>
                        <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                          {click.affiliateNetwork?.name ?? "—"} · {formatDateTime(click.clickedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="No clicks recorded" />
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this user?"
        description={`"${deleting?.email}" and their account data will be permanently removed.`}
        confirmLabel="Delete user"
        destructive
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
