"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";

import { apiClient } from "@/lib/api-client";
import {
  adminResetPasswordSchema,
  adminUserCreateSchema,
  adminUserFormSchema,
  roleSchema,
} from "@/lib/validations/system";
import { useResourceList } from "@/hooks/use-resource-list";
import { useOptions } from "@/hooks/use-options";
import { hasPermission, PERMISSION_GROUPS } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Checkbox, Field, Label } from "@/components/ui/form-field";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResourceDialog } from "@/components/forms/resource-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, RowActions, type Column } from "@/components/tables/data-table";
import { TableSkeleton } from "@/components/ui/states";
import type { AdminSession } from "@/types";

type AdminInput = z.input<typeof adminUserFormSchema>;
type AdminValues = z.output<typeof adminUserFormSchema>;
type RoleInput = z.input<typeof roleSchema>;
type RoleValues = z.output<typeof roleSchema>;
type ResetValues = z.output<typeof adminResetPasswordSchema>;

type AdminRow = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  lastLoginAt: string | null;
  role?: { _id: string; name: string; slug: string } | null;
};

type RoleRow = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  status: "active" | "inactive";
  adminCount: number;
};

const EMPTY_ADMIN: AdminInput = {
  name: "",
  email: "",
  password: "",
  phone: "",
  avatar: "",
  role: "",
  status: "active",
};

const EMPTY_ROLE: RoleInput = { name: "", description: "", permissions: [], status: "active" };

export function AdminUsersClient({ session }: { session: AdminSession }) {
  const canManageAdmins = hasPermission(session, "admins.manage");
  const canManageRoles = hasPermission(session, "roles.manage");

  return (
    <div>
      <PageHeader
        title="Admins &amp; roles"
        description="Who can sign in to this panel, and exactly what each of them can do."
      />

      <Tabs defaultValue="admins">
        <TabsList>
          <TabsTrigger value="admins">Admin users</TabsTrigger>
          <TabsTrigger value="roles">Roles &amp; permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="admins">
          <AdminsTab canManage={canManageAdmins} currentAdminId={session.id} />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab canManage={canManageRoles} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdminsTab({ canManage, currentAdminId }: { canManage: boolean; currentAdminId: string }) {
  const list = useResourceList<AdminRow>("/api/admin/admin-users");
  const roles = useOptions("roles");

  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminRow | null>(null);
  const [resetting, setResetting] = useState<AdminRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiClient.delete(`/api/admin/admin-users/${deleting._id}`);
      toast.success("Admin deleted");
      setDeleting(null);
      await list.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the admin");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<AdminRow>[] = [
    {
      key: "name",
      header: "Admin",
      sortKey: "name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--secondary)] text-xs font-semibold text-white">
            {row.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {row.name}
              {row._id === currentAdminId ? (
                <span className="ml-2 text-xs text-[var(--muted-foreground)]">(you)</span>
              ) : null}
            </p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row) => <Badge variant="navy">{row.role?.name ?? "No role"}</Badge>,
    },
    {
      key: "lastLogin",
      header: "Last login",
      sortKey: "lastLoginAt",
      render: (row) => (
        <span className="text-xs text-[var(--muted-foreground)]">
          {row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "Never"}
        </span>
      ),
    },
    { key: "status", header: "Status", sortKey: "status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) =>
        canManage ? (
          <RowActions>
            <Button variant="ghost" size="icon" aria-label="Edit admin" onClick={() => setEditing(row)}>
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Reset password"
              onClick={() => setResetting(row)}
            >
              <KeyRound />
            </Button>
            {row._id !== currentAdminId ? (
              <Button variant="ghost" size="icon" aria-label="Delete admin" onClick={() => setDeleting(row)}>
                <Trash2 className="text-[var(--destructive)]" />
              </Button>
            ) : null}
          </RowActions>
        ) : null,
    },
  ];

  return (
    <div className="space-y-3">
      {canManage ? (
        <div className="flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus />
            Add admin
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={list.items}
        loading={list.loading}
        error={list.error}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search admins…"
        sort={list.sort}
        order={list.order}
        onSort={list.toggleSort}
        page={list.page}
        limit={list.limit}
        total={list.total}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        emptyTitle="No admin users"
      />

      <ResourceDialog<AdminInput, AdminValues>
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
        title={editing ? "Edit admin" : "Add admin"}
        description={editing ? "Leave the password blank to keep the current one." : undefined}
        endpoint="/api/admin/admin-users"
        recordId={editing?._id}
        // The create endpoint still requires a password; the edit form allows "".
        schema={(editing ? adminUserFormSchema : adminUserCreateSchema) as typeof adminUserFormSchema}
        defaultValues={EMPTY_ADMIN}
        values={
          editing
            ? {
                name: editing.name,
                email: editing.email,
                password: "",
                phone: editing.phone ?? "",
                avatar: "",
                role: editing.role?._id ?? "",
                status: editing.status,
              }
            : null
        }
      >
        {({ register, formState: { errors } }) => (
          <>
            <Field label="Full name" htmlFor="adminName" error={errors.name?.message} required>
              <Input id="adminName" {...register("name")} />
            </Field>

            <Field label="Email" htmlFor="adminEmail" error={errors.email?.message} required>
              <Input id="adminEmail" type="email" {...register("email")} />
            </Field>

            <Field
              label={editing ? "New password" : "Password"}
              htmlFor="adminPassword"
              error={errors.password?.message}
              hint="At least 8 characters with an uppercase letter and a number"
              required={!editing}
            >
              <Input
                id="adminPassword"
                type="password"
                autoComplete="new-password"
                {...register("password")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Role" htmlFor="adminRole" error={errors.role?.message} required>
                <NativeSelect id="adminRole" {...register("role")}>
                  <option value="">Select a role</option>
                  {roles.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Status" htmlFor="adminStatus" error={errors.status?.message}>
                <NativeSelect id="adminStatus" {...register("status")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </NativeSelect>
              </Field>
            </div>

            <Field label="Phone" htmlFor="adminPhone" error={errors.phone?.message}>
              <Input id="adminPhone" {...register("phone")} />
            </Field>
          </>
        )}
      </ResourceDialog>

      <ResetPasswordDialog admin={resetting} onClose={() => setResetting(null)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this admin?"
        description={`"${deleting?.email}" will lose access immediately.`}
        confirmLabel="Delete admin"
        destructive
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function ResetPasswordDialog({ admin, onClose }: { admin: AdminRow | null; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ password: string }, unknown, ResetValues>({
    resolver: zodResolver(adminResetPasswordSchema),
    defaultValues: { password: "" },
  });

  useEffect(() => {
    if (admin) reset({ password: "" });
  }, [admin, reset]);

  async function onSubmit(values: ResetValues) {
    if (!admin) return;
    try {
      await apiClient.post(`/api/admin/admin-users/${admin._id}/reset-password`, values);
      toast.success(`Password reset for ${admin.email}. They have been signed out everywhere.`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset the password");
    }
  }

  return (
    <Dialog open={Boolean(admin)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field
            label="New password"
            htmlFor="resetPassword"
            error={errors.password?.message}
            hint="The admin will be signed out of all sessions"
            required
          >
            <Input
              id="resetPassword"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Reset password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RolesTab({ canManage }: { canManage: boolean }) {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<RoleRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRoles(await apiClient.get<RoleRow[]>("/api/admin/roles"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiClient.delete(`/api/admin/roles/${deleting._id}`);
      toast.success("Role deleted");
      setDeleting(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the role");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <TableSkeleton rows={4} columns={3} />;

  return (
    <div className="space-y-3">
      {canManage ? (
        <div className="flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus />
            Add role
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {roles.map((role) => (
          <Card key={role._id}>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[var(--primary)]" />
                  {role.name}
                  {role.isSystem ? <Badge variant="neutral">Built-in</Badge> : null}
                </CardTitle>
                <CardDescription>{role.description || "No description"}</CardDescription>
              </div>
              {canManage && role.slug !== "super-admin" ? (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label="Edit role" onClick={() => setEditing(role)}>
                    <Pencil />
                  </Button>
                  {!role.isSystem ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete role"
                      onClick={() => setDeleting(role)}
                    >
                      <Trash2 className="text-[var(--destructive)]" />
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <Badge variant="info">{role.permissions.length} permissions</Badge>
              <Badge variant="neutral">{role.adminCount} admin(s)</Badge>
              <StatusBadge status={role.status} />
            </CardContent>
          </Card>
        ))}
      </div>

      <ResourceDialog<RoleInput, RoleValues>
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={async () => {
          setCreating(false);
          setEditing(null);
          await load();
        }}
        title={editing ? `Edit "${editing.name}"` : "Add role"}
        description="Permissions decide which modules and actions this role can reach."
        endpoint="/api/admin/roles"
        recordId={editing?._id}
        schema={roleSchema}
        defaultValues={EMPTY_ROLE}
        className="max-w-2xl"
        values={
          editing
            ? {
                name: editing.name,
                description: editing.description ?? "",
                permissions: editing.permissions,
                status: editing.status,
              }
            : null
        }
      >
        {({ register, watch, setValue, formState: { errors } }) => {
          const selected = (watch("permissions") ?? []) as string[];

          function toggle(permission: string, checked: boolean) {
            setValue(
              "permissions",
              checked
                ? [...selected, permission]
                : selected.filter((entry) => entry !== permission),
            );
          }

          return (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Role name" htmlFor="roleName" error={errors.name?.message} required>
                  <Input id="roleName" {...register("name")} />
                </Field>
                <Field label="Status" htmlFor="roleStatus" error={errors.status?.message}>
                  <NativeSelect id="roleStatus" {...register("status")}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </NativeSelect>
                </Field>
              </div>

              <Field label="Description" htmlFor="roleDescription" error={errors.description?.message}>
                <Input id="roleDescription" {...register("description")} />
              </Field>

              <div className="space-y-3">
                <p className="text-sm font-medium">Permissions</p>
                <div className="max-h-72 space-y-4 overflow-y-auto rounded-lg border border-[var(--border)] p-4">
                  {Object.entries(PERMISSION_GROUPS).map(([group, permissions]) => (
                    <div key={group}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                        {group}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {permissions.map((permission) => (
                          <div key={permission} className="flex items-center gap-2">
                            <Checkbox
                              id={permission}
                              checked={selected.includes(permission)}
                              onCheckedChange={(checked) => toggle(permission, checked === true)}
                            />
                            <Label htmlFor={permission} className="cursor-pointer font-normal">
                              <code className="text-xs">{permission}</code>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          );
        }}
      </ResourceDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this role?"
        description={`"${deleting?.name}" can only be deleted when no admin is assigned to it.`}
        confirmLabel="Delete role"
        destructive
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
