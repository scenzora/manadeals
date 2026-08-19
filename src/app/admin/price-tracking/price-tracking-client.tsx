"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, LineChart, Minus } from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { useResourceList } from "@/hooks/use-resource-list";
import { useOptions } from "@/hooks/use-options";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PriceHistoryChart } from "@/components/charts/charts";
import { DataTable, FilterSelect, RowActions, type Column } from "@/components/tables/data-table";
import { EmptyState, Skeleton } from "@/components/ui/states";
import type { AdminSession } from "@/types";

type TrackedProduct = {
  _id: string;
  name: string;
  slug: string;
  thumbnail: string;
  originalPrice: number;
  salePrice: number;
  lowestPrice: number | null;
  highestPrice: number | null;
  currency: string;
  updatedAt: string;
  category?: { name: string } | null;
  lastChange: { priceChange: number; changePercentage: number; recordedAt: string } | null;
};

type HistoryResponse = {
  product: TrackedProduct;
  history: { _id: string; currentPrice: number; recordedAt: string; priceChange: number }[];
};

export function PriceTrackingClient({ session }: { session: AdminSession }) {
  const list = useResourceList<TrackedProduct>("/api/admin/price-tracking");
  const categories = useOptions("categories");

  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [updating, setUpdating] = useState<TrackedProduct | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [busy, setBusy] = useState(false);

  const canManage = hasPermission(session, "price-tracking.manage");

  async function openHistory(product: TrackedProduct) {
    setLoadingHistory(true);
    setHistory(null);
    try {
      const data = await apiClient.get<HistoryResponse>(`/api/admin/price-tracking/${product._id}`);
      setHistory(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load the price history");
    } finally {
      setLoadingHistory(false);
    }
  }

  async function submitPrice() {
    if (!updating) return;
    const value = Number(newPrice);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a valid price");
      return;
    }

    setBusy(true);
    try {
      await apiClient.post("/api/admin/price-tracking", {
        product: updating._id,
        currentPrice: value,
        source: "manual",
      });
      toast.success(`Price updated for "${updating.name}"`);
      setUpdating(null);
      setNewPrice("");
      await list.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the price");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<TrackedProduct>[] = [
    {
      key: "name",
      header: "Product",
      sortKey: "name",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.name}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{row.category?.name ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "current",
      header: "Current",
      sortKey: "salePrice",
      render: (row) => <span className="font-medium">{formatCurrency(row.salePrice)}</span>,
    },
    {
      key: "range",
      header: "Lowest / highest",
      render: (row) => (
        <span className="text-xs text-[var(--muted-foreground)]">
          {row.lowestPrice != null ? formatCurrency(row.lowestPrice) : "—"} /{" "}
          {row.highestPrice != null ? formatCurrency(row.highestPrice) : "—"}
        </span>
      ),
    },
    {
      key: "change",
      header: "Last change",
      render: (row) => {
        if (!row.lastChange) return <span className="text-xs text-[var(--muted-foreground)]">—</span>;
        const { priceChange, changePercentage } = row.lastChange;
        if (priceChange === 0) {
          return (
            <Badge variant="neutral">
              <Minus className="size-3" />
              No change
            </Badge>
          );
        }
        return (
          <Badge variant={priceChange < 0 ? "success" : "danger"}>
            {priceChange < 0 ? (
              <ArrowDownRight className="size-3" />
            ) : (
              <ArrowUpRight className="size-3" />
            )}
            {formatCurrency(Math.abs(priceChange))} ({Math.abs(changePercentage)}%)
          </Badge>
        );
      },
    },
    {
      key: "updated",
      header: "Updated",
      sortKey: "updatedAt",
      render: (row) => (
        <span className="text-xs text-[var(--muted-foreground)]">{formatDateTime(row.updatedAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <RowActions>
          <Button
            variant="ghost"
            size="icon"
            aria-label="View price history"
            onClick={() => void openHistory(row)}
          >
            <LineChart />
          </Button>
          {canManage ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setUpdating(row);
                setNewPrice(String(row.salePrice));
              }}
            >
              Update price
            </Button>
          ) : null}
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Price tracking"
        description="Historical prices per product. Update manually today; an automated price service can write to the same history later."
      />

      <DataTable
        columns={columns}
        rows={list.items}
        loading={list.loading}
        error={list.error}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search tracked products…"
        filters={
          <FilterSelect
            value={list.filters.category as string}
            onChange={(value) => list.setFilter("category", value)}
            placeholder="All categories"
            options={categories.options}
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
        emptyTitle="Nothing tracked yet"
        emptyDescription="Add products to start building price history."
      />

      <Dialog
        open={loadingHistory || Boolean(history)}
        onOpenChange={(open) => {
          if (!open) setHistory(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{history?.product.name ?? "Price history"}</DialogTitle>
            <DialogDescription>
              {history
                ? `Lowest ${formatCurrency(history.product.lowestPrice ?? 0)} · highest ${formatCurrency(
                    history.product.highestPrice ?? 0,
                  )}`
                : "Loading…"}
            </DialogDescription>
          </DialogHeader>

          {loadingHistory ? (
            <Skeleton className="h-64 w-full" />
          ) : history && history.history.length > 0 ? (
            <PriceHistoryChart
              data={history.history.map((entry) => ({
                date: new Date(entry.recordedAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                }),
                price: entry.currentPrice,
              }))}
            />
          ) : (
            <EmptyState title="No price history recorded yet" />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(updating)} onOpenChange={(open) => !open && setUpdating(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update price</DialogTitle>
            <DialogDescription>
              {updating?.name} · currently {formatCurrency(updating?.salePrice ?? 0)}
            </DialogDescription>
          </DialogHeader>

          <Field label="New sale price" htmlFor="newPrice" required>
            <Input
              id="newPrice"
              type="number"
              min={0}
              step="0.01"
              value={newPrice}
              onChange={(event) => setNewPrice(event.target.value)}
            />
          </Field>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdating(null)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={() => void submitPrice()}>
              Save price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
