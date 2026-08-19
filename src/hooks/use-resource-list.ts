"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiClient, buildQuery } from "@/lib/api-client";
import type { Paginated } from "@/types";

type Filters = Record<string, string | number | boolean | undefined>;

/**
 * Shared list-page state: search (debounced), filters, sorting, pagination and
 * refetching. Every admin table screen is built on top of this hook.
 */
export function useResourceList<T>(endpoint: string, initialFilters: Filters = {}) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useMemo(
    () => buildQuery({ page, limit, search: debouncedSearch, sort, order, ...filters }),
    [page, limit, debouncedSearch, sort, order, filters],
  );

  const fetchList = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Paginated<T>>(`${endpoint}${query}`);
      if (currentRequest !== requestId.current) return; // a newer request won
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (caught) {
      if (currentRequest !== requestId.current) return;
      setError(caught instanceof Error ? caught.message : "Failed to load data");
      setItems([]);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [endpoint, query]);

  useEffect(() => {
    // Fetching on mount/params change is the intended use of an effect here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchList();
  }, [fetchList]);

  const setFilter = useCallback((key: string, value: string | number | boolean | undefined) => {
    setFilters((previous) => ({ ...previous, [key]: value === "" ? undefined : value }));
    setPage(1);
  }, []);

  const toggleSort = useCallback((field: string) => {
    setSort((previousField) => {
      setOrder((previousOrder) =>
        previousField === field ? (previousOrder === "asc" ? "desc" : "asc") : "desc",
      );
      return field;
    });
  }, []);

  return {
    items,
    total,
    totalPages,
    page,
    limit,
    search,
    sort,
    order,
    filters,
    loading,
    error,
    setPage,
    setLimit,
    setSearch,
    setFilter,
    setFilters,
    toggleSort,
    refresh: fetchList,
  };
}
