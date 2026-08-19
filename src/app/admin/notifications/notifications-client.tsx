"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { notificationSchema } from "@/lib/validations/system";
import { useResourceList } from "@/hooks/use-resource-list";
import { hasPermission } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { ResourceDialog } from "@/components/forms/resource-dialog";
import { DataTable, FilterSelect, RowActions, type Column } from "@/components/tables/data-table";
import type { AdminSession } from "@/types";

type NotificationInput = z.input<typeof notificationSchema>;
type NotificationValues = z.output<typeof notificationSchema>;

type NotificationRow = {
  _id: string;
  title: string;
  message: string;
  type: string;
  channel: string;
  link: string;
  isRead: boolean;
  createdAt: string;
};

const TYPE_VARIANT: Record<string, "info" | "success" | "warning" | "danger" | "neutral"> = {
  info: "info",
  success: "success",
  warning: "warning",
  error: "danger",
  "price-drop": "success",
  system: "neutral",
};

const EMPTY: NotificationInput = {
  title: "",
  message: "",
  type: "info",
  channel: "in-app",
  recipient: null,
  link: "",
};

export function NotificationsClient({ session }: { session: AdminSession }) {
  const list = useResourceList<NotificationRow>("/api/admin/notifications");
  const [creating, setCreating] = useState(false);

  const canManage = hasPermission(session, "notifications.manage");

  async function markRead(row: NotificationRow) {
    try {
      await apiClient.patch(`/api/admin/notifications/${row._id}`);
      await list.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the notification");
    }
  }

  async function remove(row: NotificationRow) {
    try {
      await apiClient.delete(`/api/admin/notifications/${row._id}`);
      toast.success("Notification deleted");
      await list.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the notification");
    }
  }

  const columns: Column<NotificationRow>[] = [
    {
      key: "title",
      header: "Notification",
      render: (row) => (
        <div className="min-w-0">
          <p className={row.isRead ? "truncate" : "truncate font-semibold"}>{row.title}</p>
          <p className="line-clamp-1 text-xs text-[var(--muted-foreground)]">{row.message}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortKey: "type",
      render: (row) => (
        <Badge variant={TYPE_VARIANT[row.type] ?? "neutral"} className="capitalize">
          {row.type.replace(/-/g, " ")}
        </Badge>
      ),
    },
    { key: "channel", header: "Channel", render: (row) => <span className="capitalize">{row.channel}</span> },
    {
      key: "createdAt",
      header: "Received",
      sortKey: "createdAt",
      render: (row) => (
        <span className="text-xs text-[var(--muted-foreground)]">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <RowActions>
          {!row.isRead ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mark as read"
              onClick={() => void markRead(row)}
            >
              <Check className="text-[var(--success)]" />
            </Button>
          ) : null}
          {canManage ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete notification"
              onClick={() => void remove(row)}
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
        title="Notifications"
        description="Alerts for the admin team. Email, Telegram and WhatsApp channels are stored ready for a future dispatcher."
        actions={
          canManage ? (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              New notification
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
        searchPlaceholder="Search notifications…"
        filters={
          <>
            <FilterSelect
              value={list.filters.type as string}
              onChange={(value) => list.setFilter("type", value)}
              placeholder="All types"
              options={[
                { value: "info", label: "Info" },
                { value: "success", label: "Success" },
                { value: "warning", label: "Warning" },
                { value: "error", label: "Error" },
                { value: "price-drop", label: "Price drop" },
                { value: "system", label: "System" },
              ]}
            />
            <FilterSelect
              value={list.filters.unread as string}
              onChange={(value) => list.setFilter("unread", value)}
              placeholder="All"
              options={[{ value: "true", label: "Unread only" }]}
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
        emptyTitle="No notifications"
        emptyDescription="You are all caught up."
      />

      <ResourceDialog<NotificationInput, NotificationValues>
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={async () => {
          setCreating(false);
          await list.refresh();
        }}
        title="New notification"
        description="Leave the recipient empty to broadcast to every admin."
        endpoint="/api/admin/notifications"
        schema={notificationSchema}
        defaultValues={EMPTY}
      >
        {({ register, formState: { errors } }) => (
          <>
            <Field label="Title" htmlFor="notificationTitle" error={errors.title?.message} required>
              <Input id="notificationTitle" {...register("title")} />
            </Field>

            <Field label="Message" htmlFor="notificationMessage" error={errors.message?.message}>
              <Textarea id="notificationMessage" rows={3} {...register("message")} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Type" htmlFor="notificationType" error={errors.type?.message}>
                <NativeSelect id="notificationType" {...register("type")}>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="price-drop">Price drop</option>
                  <option value="system">System</option>
                </NativeSelect>
              </Field>
              <Field label="Channel" htmlFor="notificationChannel" error={errors.channel?.message}>
                <NativeSelect id="notificationChannel" {...register("channel")}>
                  <option value="in-app">In-app</option>
                  <option value="email">Email</option>
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                </NativeSelect>
              </Field>
            </div>

            <Field label="Link" htmlFor="notificationLink" error={errors.link?.message}>
              <Input id="notificationLink" placeholder="/admin/products" {...register("link")} />
            </Field>
          </>
        )}
      </ResourceDialog>
    </div>
  );
}
