"use client";

import { useState } from "react";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { affiliateNetworkSchema } from "@/lib/validations/catalogue";
import { useResourceList } from "@/hooks/use-resource-list";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResourceDialog } from "@/components/forms/resource-dialog";
import { DataTable, RowActions, type Column } from "@/components/tables/data-table";
import type { AdminSession } from "@/types";

type NetworkInput = z.input<typeof affiliateNetworkSchema>;
type NetworkValues = z.output<typeof affiliateNetworkSchema>;

type NetworkRow = {
  _id: string;
  name: string;
  code: string;
  logo: string;
  trackingId?: string;
  baseUrl: string;
  affiliateUrlPattern: string;
  commissionPercentage: number;
  status: "active" | "inactive";
};

const EMPTY: NetworkInput = {
  name: "",
  code: "",
  logo: "",
  trackingId: "",
  apiKey: "",
  apiSecret: "",
  baseUrl: "",
  affiliateUrlPattern: "",
  commissionPercentage: 0,
  status: "active",
};

export function NetworksClient({ session }: { session: AdminSession }) {
  const list = useResourceList<NetworkRow>("/api/admin/affiliate-networks");
  const [editing, setEditing] = useState<NetworkRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<NetworkRow | null>(null);
  const [busy, setBusy] = useState(false);

  const canCreate = hasPermission(session, "affiliate-networks.create");
  const canEdit = hasPermission(session, "affiliate-networks.edit");
  const canDelete = hasPermission(session, "affiliate-networks.delete");

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiClient.delete(`/api/admin/affiliate-networks/${deleting._id}`);
      toast.success(`Deleted "${deleting.name}"`);
      setDeleting(null);
      await list.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the network");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<NetworkRow>[] = [
    {
      key: "name",
      header: "Network",
      sortKey: "name",
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{row.code}</p>
        </div>
      ),
    },
    {
      key: "commission",
      header: "Commission",
      sortKey: "commissionPercentage",
      render: (row) => <Badge variant="navy">{row.commissionPercentage}%</Badge>,
    },
    {
      key: "pattern",
      header: "URL pattern",
      render: (row) => (
        <code className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-xs">
          {row.affiliateUrlPattern || "—"}
        </code>
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
            <Button variant="ghost" size="icon" onClick={() => setEditing(row)} aria-label="Edit network">
              <Pencil />
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="ghost" size="icon" onClick={() => setDeleting(row)} aria-label="Delete network">
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
        title="Affiliate networks"
        description="Amazon, Flipkart and any other partner you earn commission from."
        actions={
          canCreate ? (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              Add network
            </Button>
          ) : undefined
        }
      />

      <div className="mb-3 flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
        <Lock className="mt-0.5 size-4 shrink-0" />
        <span>
          API keys and secrets are stored server-side and never returned to the browser. Leave those
          fields blank to keep the existing values.
        </span>
      </div>

      <DataTable
        columns={columns}
        rows={list.items}
        loading={list.loading}
        error={list.error}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search networks…"
        sort={list.sort}
        order={list.order}
        onSort={list.toggleSort}
        page={list.page}
        limit={list.limit}
        total={list.total}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        emptyTitle="No affiliate networks configured"
        emptyDescription="Add at least one network before creating products."
      />

      <ResourceDialog<NetworkInput, NetworkValues>
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
        title={editing ? "Edit affiliate network" : "Add affiliate network"}
        description="The URL pattern supports {url} and {trackingId} placeholders."
        endpoint="/api/admin/affiliate-networks"
        recordId={editing?._id}
        schema={affiliateNetworkSchema}
        defaultValues={EMPTY}
        values={
          editing
            ? {
                name: editing.name,
                code: editing.code,
                logo: editing.logo ?? "",
                trackingId: editing.trackingId ?? "",
                apiKey: "",
                apiSecret: "",
                baseUrl: editing.baseUrl ?? "",
                affiliateUrlPattern: editing.affiliateUrlPattern ?? "",
                commissionPercentage: editing.commissionPercentage,
                status: editing.status,
              }
            : null
        }
      >
        {({ register, formState: { errors } }) => (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Network name" htmlFor="networkName" error={errors.name?.message} required>
                <Input id="networkName" {...register("name")} />
              </Field>
              <Field
                label="Network code"
                htmlFor="networkCode"
                error={errors.code?.message}
                hint="Lowercase, e.g. amazon"
                required
              >
                <Input id="networkCode" {...register("code")} />
              </Field>
            </div>

            <Field label="Base URL" htmlFor="networkBaseUrl" error={errors.baseUrl?.message}>
              <Input id="networkBaseUrl" placeholder="https://www.amazon.in" {...register("baseUrl")} />
            </Field>

            <Field
              label="Affiliate URL pattern"
              htmlFor="networkPattern"
              error={errors.affiliateUrlPattern?.message}
              hint="e.g. {url}?tag={trackingId}"
            >
              <Input id="networkPattern" {...register("affiliateUrlPattern")} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tracking ID" htmlFor="networkTrackingId" error={errors.trackingId?.message}>
                <Input id="networkTrackingId" {...register("trackingId")} />
              </Field>
              <Field
                label="Commission %"
                htmlFor="networkCommission"
                error={errors.commissionPercentage?.message}
              >
                <Input
                  id="networkCommission"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  {...register("commissionPercentage")}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="API key"
                htmlFor="networkApiKey"
                error={errors.apiKey?.message}
                hint="Write-only"
              >
                <Input id="networkApiKey" type="password" autoComplete="off" {...register("apiKey")} />
              </Field>
              <Field
                label="API secret"
                htmlFor="networkApiSecret"
                error={errors.apiSecret?.message}
                hint="Write-only"
              >
                <Input
                  id="networkApiSecret"
                  type="password"
                  autoComplete="off"
                  {...register("apiSecret")}
                />
              </Field>
            </div>

            <Field label="Status" htmlFor="networkStatus" error={errors.status?.message}>
              <NativeSelect id="networkStatus" {...register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </NativeSelect>
            </Field>
          </>
        )}
      </ResourceDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this affiliate network?"
        description={`Products linked to "${deleting?.name}" will keep their stored URLs but lose the network reference.`}
        confirmLabel="Delete network"
        destructive
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
