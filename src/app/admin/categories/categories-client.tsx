"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight, GripVertical, ListTree, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { categorySchema } from "@/lib/validations/catalogue";
import { hasPermission } from "@/lib/permissions";
import { slugify } from "@/lib/utils/slug";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, ToggleRow } from "@/components/ui/form-field";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import type { AdminSession, Paginated } from "@/types";

type CategoryInput = z.input<typeof categorySchema>;
type CategoryValues = z.output<typeof categorySchema>;

type CategoryRow = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  icon: string;
  order: number;
  isFeatured: boolean;
  status: "active" | "inactive";
  parent?: { _id: string; name: string } | null;
  seo?: { title: string; description: string; keywords: string[] };
};

const EMPTY: CategoryInput = {
  name: "",
  slug: "",
  description: "",
  image: "",
  icon: "",
  parent: null,
  order: 0,
  isFeatured: false,
  status: "active",
  seo: { title: "", description: "", keywords: [] },
};

export function CategoriesClient({ session }: { session: AdminSession }) {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CategoryRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const canCreate = hasPermission(session, "categories.create");
  const canEdit = hasPermission(session, "categories.edit");
  const canDelete = hasPermission(session, "categories.delete");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Paginated<CategoryRow>>(
        "/api/admin/categories?limit=100&sort=order&order=asc",
      );
      setCategories(data.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const tree = useMemo(() => {
    const parents = categories.filter((category) => !category.parent);
    return parents.map((parent) => ({
      parent,
      children: categories
        .filter((category) => category.parent?._id === parent._id)
        .sort((a, b) => a.order - b.order),
    }));
  }, [categories]);

  /** Persists the new order after a drag, optimistically updating the list. */
  async function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId || !canEdit) return;

    const ordered = [...categories.filter((category) => !category.parent)];
    const fromIndex = ordered.findIndex((category) => category._id === dragId);
    const toIndex = ordered.findIndex((category) => category._id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, moved!);

    const items = ordered.map((category, index) => ({ id: category._id, order: index }));
    setCategories((previous) =>
      previous.map((category) => {
        const match = items.find((item) => item.id === category._id);
        return match ? { ...category, order: match.order } : category;
      }),
    );
    setDragId(null);

    try {
      await apiClient.post("/api/admin/categories/reorder", { items });
      toast.success("Order saved");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not save the new order");
      await load();
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiClient.delete(`/api/admin/categories/${deleting._id}`);
      toast.success(`Deleted "${deleting.name}"`);
      setDeleting(null);
      await load();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not delete the category");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organise the catalogue. Drag top-level categories to change their order."
        actions={
          canCreate ? (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              Add category
            </Button>
          ) : undefined
        }
      />

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <TableSkeleton rows={5} columns={3} />
      ) : tree.length === 0 ? (
        <EmptyState
          icon={<ListTree className="size-6" />}
          title="No categories yet"
          description="Categories group your products and power the storefront navigation."
          action={canCreate ? <Button onClick={() => setCreating(true)}>Add category</Button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {tree.map(({ parent, children }) => (
            <Card
              key={parent._id}
              draggable={canEdit}
              onDragStart={() => setDragId(parent._id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(parent._id)}
              className={dragId === parent._id ? "opacity-60" : undefined}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {canEdit ? (
                    <GripVertical className="size-4 shrink-0 cursor-grab text-[var(--muted-foreground)]" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{parent.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      /{parent.slug} · {children.length} subcategor{children.length === 1 ? "y" : "ies"}
                    </p>
                  </div>
                  <StatusBadge status={parent.status} />
                  {canEdit ? (
                    <Button variant="ghost" size="icon" onClick={() => setEditing(parent)} aria-label="Edit">
                      <Pencil />
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(parent)} aria-label="Delete">
                      <Trash2 className="text-[var(--destructive)]" />
                    </Button>
                  ) : null}
                </div>

                {children.length > 0 ? (
                  <div className="mt-3 space-y-1 border-t border-[var(--border)] pt-3">
                    {children.map((child) => (
                      <div
                        key={child._id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--muted)]"
                      >
                        <ChevronRight className="size-3.5 text-[var(--muted-foreground)]" />
                        <span className="min-w-0 flex-1 truncate">{child.name}</span>
                        <StatusBadge status={child.status} />
                        {canEdit ? (
                          <Button variant="ghost" size="icon" onClick={() => setEditing(child)} aria-label="Edit">
                            <Pencil />
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleting(child)}
                            aria-label="Delete"
                          >
                            <Trash2 className="text-[var(--destructive)]" />
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CategoryDialog
        open={creating || Boolean(editing)}
        category={editing}
        parents={categories.filter((category) => !category.parent)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={async () => {
          setCreating(false);
          setEditing(null);
          await load();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this category?"
        description={`"${deleting?.name}" will be removed. Products in it keep their reference until reassigned.`}
        confirmLabel="Delete category"
        destructive
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function CategoryDialog({
  open,
  category,
  parents,
  onClose,
  onSaved,
}: {
  open: boolean;
  category: CategoryRow | null;
  parents: CategoryRow[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput, unknown, CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      category
        ? {
            name: category.name,
            slug: category.slug,
            description: category.description ?? "",
            image: category.image ?? "",
            icon: category.icon ?? "",
            parent: category.parent?._id ?? null,
            order: category.order,
            isFeatured: category.isFeatured,
            status: category.status,
            seo: category.seo ?? { title: "", description: "", keywords: [] },
          }
        : EMPTY,
    );
  }, [open, category, reset]);

  const name = watch("name");

  async function onSubmit(values: CategoryValues) {
    try {
      if (category) await apiClient.put(`/api/admin/categories/${category._id}`, values);
      else await apiClient.post("/api/admin/categories", values);
      toast.success(category ? "Category updated" : "Category created");
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the category");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "Add category"}</DialogTitle>
          <DialogDescription>
            Categories can be nested one level deep (parent → subcategory).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Name" htmlFor="categoryName" error={errors.name?.message} required>
            <Input
              id="categoryName"
              {...register("name")}
              onBlur={(event) => {
                if (!category) setValue("slug", slugify(event.target.value));
              }}
            />
          </Field>

          <Field label="Slug" htmlFor="categorySlug" error={errors.slug?.message} required>
            <Input id="categorySlug" placeholder={slugify(name || "")} {...register("slug")} />
          </Field>

          <Field label="Parent category" htmlFor="categoryParent" error={errors.parent?.message}>
            <NativeSelect id="categoryParent" {...register("parent")}>
              <option value="">None (top level)</option>
              {parents
                .filter((parent) => parent._id !== category?._id)
                .map((parent) => (
                  <option key={parent._id} value={parent._id}>
                    {parent.name}
                  </option>
                ))}
            </NativeSelect>
          </Field>

          <Field label="Description" htmlFor="categoryDescription" error={errors.description?.message}>
            <Textarea id="categoryDescription" rows={2} {...register("description")} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Image URL" htmlFor="categoryImage" error={errors.image?.message}>
              <Input id="categoryImage" placeholder="https://" {...register("image")} />
            </Field>
            <Field label="Status" htmlFor="categoryStatus" error={errors.status?.message}>
              <NativeSelect id="categoryStatus" {...register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </NativeSelect>
            </Field>
          </div>

          <ToggleRow
            label="Featured category"
            description="Highlight on the storefront homepage"
            checked={Boolean(watch("isFeatured"))}
            onCheckedChange={(value) => setValue("isFeatured", value)}
          />

          <Field label="SEO title" htmlFor="categorySeoTitle" error={errors.seo?.title?.message}>
            <Input id="categorySeoTitle" {...register("seo.title")} />
          </Field>

          <Field
            label="SEO description"
            htmlFor="categorySeoDescription"
            error={errors.seo?.description?.message}
          >
            <Textarea id="categorySeoDescription" rows={2} {...register("seo.description")} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {category ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
