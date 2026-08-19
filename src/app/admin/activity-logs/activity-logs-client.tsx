"use client";

import { useState } from "react";
import { Eye } from "lucide-react";

import { useResourceList } from "@/hooks/use-resource-list";
import { formatDateTime } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, FilterSelect, RowActions, type Column } from "@/components/tables/data-table";

type LogRow = {
  _id: string;
  adminName: string;
  adminEmail: string;
  action: string;
  module: string;
  recordId: string;
  description: string;
  ipAddress: string;
  userAgent: string;
  beforeValue: unknown;
  afterValue: unknown;
  createdAt: string;
};

const ACTION_VARIANT: Record<string, "success" | "info" | "danger" | "warning" | "neutral"> = {
  create: "success",
  update: "info",
  delete: "danger",
  login: "neutral",
  logout: "neutral",
  "login-failed": "warning",
  import: "info",
  export: "info",
};

export function ActivityLogsClient() {
  const list = useResourceList<LogRow>("/api/admin/activity-logs");
  const [viewing, setViewing] = useState<LogRow | null>(null);

  const columns: Column<LogRow>[] = [
    {
      key: "admin",
      header: "Admin",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.adminName || "System"}</p>
          <p className="truncate text-xs text-[var(--muted-foreground)]">{row.adminEmail || "—"}</p>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      sortKey: "action",
      render: (row) => (
        <Badge variant={ACTION_VARIANT[row.action] ?? "neutral"} className="capitalize">
          {row.action.replace(/-/g, " ")}
        </Badge>
      ),
    },
    {
      key: "module",
      header: "Module",
      sortKey: "module",
      render: (row) => <span className="capitalize">{row.module.replace(/-/g, " ")}</span>,
    },
    {
      key: "description",
      header: "Description",
      render: (row) => <span className="line-clamp-1 text-sm">{row.description || "—"}</span>,
    },
    { key: "ip", header: "IP", render: (row) => <code className="text-xs">{row.ipAddress || "—"}</code> },
    {
      key: "createdAt",
      header: "When",
      sortKey: "createdAt",
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-[var(--muted-foreground)]">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <RowActions>
          <Button variant="ghost" size="icon" aria-label="View entry" onClick={() => setViewing(row)}>
            <Eye />
          </Button>
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Activity logs"
        description="Every create, update, delete and sign-in performed in this panel."
      />

      <DataTable
        columns={columns}
        rows={list.items}
        loading={list.loading}
        error={list.error}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search by admin or description…"
        filters={
          <>
            <FilterSelect
              value={list.filters.action as string}
              onChange={(value) => list.setFilter("action", value)}
              placeholder="All actions"
              options={Object.keys(ACTION_VARIANT).map((action) => ({
                value: action,
                label: action.replace(/-/g, " "),
              }))}
            />
            <FilterSelect
              value={list.filters.module as string}
              onChange={(value) => list.setFilter("module", value)}
              placeholder="All modules"
              options={[
                "auth",
                "products",
                "categories",
                "brands",
                "affiliate-networks",
                "deals",
                "coupons",
                "banners",
                "blog",
                "users",
                "admin-users",
                "roles",
                "settings",
                "price-tracking",
                "notifications",
                "profile",
              ].map((module) => ({ value: module, label: module.replace(/-/g, " ") }))}
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
        emptyTitle="No activity logged yet"
      />

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {viewing?.action.replace(/-/g, " ")} · {viewing?.module}
            </DialogTitle>
            <DialogDescription>
              {viewing?.adminName} · {viewing ? formatDateTime(viewing.createdAt) : ""} ·{" "}
              {viewing?.ipAddress}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-1 font-medium">Description</p>
              <p className="text-[var(--muted-foreground)]">{viewing?.description || "—"}</p>
            </div>

            {viewing?.recordId ? (
              <div>
                <p className="mb-1 font-medium">Record</p>
                <code className="text-xs">{viewing.recordId}</code>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 font-medium">Before</p>
                <pre className="max-h-56 overflow-auto rounded-lg bg-[var(--muted)] p-3 text-xs">
                  {JSON.stringify(viewing?.beforeValue ?? null, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 font-medium">After</p>
                <pre className="max-h-56 overflow-auto rounded-lg bg-[var(--muted)] p-3 text-xs">
                  {JSON.stringify(viewing?.afterValue ?? null, null, 2)}
                </pre>
              </div>
            </div>

            {viewing?.userAgent ? (
              <p className="text-xs text-[var(--muted-foreground)]">{viewing.userAgent}</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
