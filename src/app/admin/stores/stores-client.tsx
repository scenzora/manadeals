"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { apiClient, ApiClientError } from "@/lib/api-client";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import type { AdminSession } from "@/types";
import type { AdminStoreRow } from "@/services/store-admin.service";

type Result = { items: AdminStoreRow[]; total: number; page: number; totalPages: number };

const STATUS_VARIANT = { draft: "neutral", active: "success", suspended: "danger" } as const;
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "manadeals.online";

export function StoresClient({ session }: { session: AdminSession }) {
  const [data, setData] = useState<Result | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const canManage = hasPermission(session, "stores.manage");

  const load = useCallback(() => {
    const query = new URLSearchParams({ page: String(page), ...(q ? { q } : {}), ...(status ? { status } : {}) });
    apiClient.get<Result>(`/api/admin/stores?${query}`).then(setData).catch(() => toast.error("Could not load stores"));
  }, [page, q, status]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function update(id: string, body: Record<string, unknown>) {
    try {
      await apiClient.patch(`/api/admin/stores/${id}`, body);
      toast.success("Store updated");
      load();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Update failed");
    }
  }

  function toggleSuspension(store: AdminStoreRow) {
    if (store.status === "suspended") return update(store.id, { status: "active" });
    const reason = window.prompt(`Suspend ${store.name}? Enter a reason (shown to staff only):`);
    if (reason === null) return;
    return update(store.id, { status: "suspended", suspendedReason: reason });
  }

  return (
    <>
      <PageHeader title="White-label stores" description="Every store launched on the platform" />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Search name or address…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          className="max-w-xs"
        />
        <NativeSelect
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="w-40"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </NativeSelect>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs uppercase text-[var(--muted-foreground)]">
              <th className="p-3">Store</th>
              <th className="p-3">Owner</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Status</th>
              <th className="p-3">Domain</th>
              <th className="p-3 text-right">Clicks (30d / all)</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {data?.items.map((store) => (
              <tr key={store.id} className="border-b border-[var(--border)] last:border-0">
                <td className="p-3">
                  <a
                    href={`https://${store.slug}.${ROOT}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium hover:underline"
                  >
                    {store.name} <ExternalLink className="size-3" />
                  </a>
                  <p className="text-xs text-[var(--muted-foreground)]">{store.slug}</p>
                </td>
                <td className="p-3">{store.ownerEmail || "—"}</td>
                <td className="p-3">
                  <NativeSelect
                    value={store.plan}
                    disabled={!canManage}
                    onChange={(e) => update(store.id, { plan: e.target.value })}
                    className="h-8 w-24"
                    aria-label={`Plan for ${store.name}`}
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                  </NativeSelect>
                </td>
                <td className="p-3">
                  <Badge variant={STATUS_VARIANT[store.status]}>{store.status}</Badge>
                  {store.suspendedReason ? (
                    <p className="mt-1 max-w-48 text-xs text-[var(--muted-foreground)]">{store.suspendedReason}</p>
                  ) : null}
                </td>
                <td className="p-3">
                  {store.domain ? (
                    <>
                      {store.domain.hostname}
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {store.domain.verificationStatus} · SSL {store.domain.sslStatus}
                      </p>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3 text-right tabular-nums">
                  {store.clicks30d} / {store.clicksTotal}
                </td>
                <td className="p-3 text-right">
                  {canManage ? (
                    <Button
                      size="sm"
                      variant={store.status === "suspended" ? "outline" : "destructive"}
                      onClick={() => toggleSuspension(store)}
                    >
                      {store.status === "suspended" ? "Unsuspend" : "Suspend"}
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-[var(--muted-foreground)]">
                  No stores found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-[var(--muted-foreground)]">
            Page {data.page} of {data.totalPages} · {data.total} stores
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
