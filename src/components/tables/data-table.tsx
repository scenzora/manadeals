"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/form-field";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";

export type Column<T> = {
  key: string;
  header: string;
  /** Field name to sort by; omit to make the column unsortable. */
  sortKey?: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};

export function DataTable<T extends { _id: string }>({
  columns,
  rows,
  loading,
  error,
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  actions,
  sort,
  order,
  onSort,
  selection,
  onSelectionChange,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
}: {
  columns: Column<T>[];
  rows: T[];
  loading: boolean;
  error?: string | null;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  sort?: string;
  order?: "asc" | "desc";
  onSort?: (field: string) => void;
  selection?: string[];
  onSelectionChange?: (ids: string[]) => void;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}) {
  const selectable = Boolean(selection && onSelectionChange);
  const allSelected = selectable && rows.length > 0 && rows.every((row) => selection!.includes(row._id));

  function toggleAll(checked: boolean) {
    if (!onSelectionChange) return;
    const ids = rows.map((row) => row._id);
    onSelectionChange(
      checked
        ? [...new Set([...(selection ?? []), ...ids])]
        : (selection ?? []).filter((id) => !ids.includes(id)),
    );
  }

  function toggleRow(id: string, checked: boolean) {
    if (!onSelectionChange) return;
    onSelectionChange(
      checked ? [...(selection ?? []), id] : (selection ?? []).filter((entry) => entry !== id),
    );
  }

  return (
    <div className="space-y-3">
      {(onSearchChange || filters || actions) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {onSearchChange ? (
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input
                  value={search ?? ""}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-9"
                />
              </div>
            ) : null}
            {filters}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      )}

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <TableSkeleton columns={Math.min(columns.length + (selectable ? 1 : 0), 6)} />
      ) : rows.length === 0 && !error ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <TableWrapper>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                {selectable ? (
                  <TH className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => toggleAll(checked === true)}
                      aria-label="Select all rows"
                    />
                  </TH>
                ) : null}
                {columns.map((column) => (
                  <TH key={column.key} className={column.className}>
                    {column.sortKey && onSort ? (
                      <button
                        className="inline-flex items-center gap-1 hover:text-[var(--foreground)]"
                        onClick={() => onSort(column.sortKey!)}
                      >
                        {column.header}
                        {sort === column.sortKey ? (
                          order === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TH>
                ))}
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => (
                <TR key={row._id} className={cn(selection?.includes(row._id) && "bg-[var(--accent)]/40")}>
                  {selectable ? (
                    <TD>
                      <Checkbox
                        checked={selection!.includes(row._id)}
                        onCheckedChange={(checked) => toggleRow(row._id, checked === true)}
                        aria-label="Select row"
                      />
                    </TD>
                  ) : null}
                  {columns.map((column) => (
                    <TD key={column.key} className={column.className}>
                      {column.render(row)}
                    </TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>

          <Pagination
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            onPageChange={onPageChange}
            onLimitChange={onLimitChange}
          />
        </TableWrapper>
      )}
    </div>
  );
}

/** Small select used for table filters. */
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value?: string | number | boolean;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <select
      value={value === undefined ? "" : String(value)}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 rounded-md border border-[var(--input)] bg-[var(--card)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** Row of icon buttons rendered in the last table column. */
export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-1">{children}</div>;
}
