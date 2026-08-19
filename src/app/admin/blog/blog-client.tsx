"use client";

import { useState } from "react";
import { BookOpen, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { blogPostSchema } from "@/lib/validations/marketing";
import { useResourceList } from "@/hooks/use-resource-list";
import { hasPermission } from "@/lib/permissions";
import { slugify } from "@/lib/utils/slug";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";
import { ImageField } from "@/components/forms/image-field";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResourceDialog } from "@/components/forms/resource-dialog";
import { DataTable, FilterSelect, RowActions, type Column } from "@/components/tables/data-table";
import type { AdminSession } from "@/types";

type BlogInput = z.input<typeof blogPostSchema>;
type BlogValues = z.output<typeof blogPostSchema>;

type BlogRow = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  tags: string[];
  status: string;
  publishedAt: string | null;
  viewCount: number;
  author?: { name: string } | null;
  seo?: { title: string; description: string; keywords: string[]; ogImage?: string };
};

function toDateTimeInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const EMPTY: BlogInput = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featuredImage: "",
  categories: [],
  tags: [],
  status: "draft",
  publishedAt: null,
  seo: { title: "", description: "", keywords: [], ogImage: "" },
};

export function BlogClient({ session }: { session: AdminSession }) {
  const list = useResourceList<BlogRow>("/api/admin/blog");
  const [editing, setEditing] = useState<BlogRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<BlogRow | null>(null);
  const [busy, setBusy] = useState(false);

  const canCreate = hasPermission(session, "blog.create");
  const canEdit = hasPermission(session, "blog.edit");
  const canDelete = hasPermission(session, "blog.delete");

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiClient.delete(`/api/admin/blog/${deleting._id}`);
      toast.success(`Deleted "${deleting.title}"`);
      setDeleting(null);
      await list.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the article");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<BlogRow>[] = [
    {
      key: "title",
      header: "Article",
      sortKey: "title",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.title}</p>
          <p className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
            /blog/{row.slug}
            {row.status === "published" ? (
              <a
                href={`/blog/${row.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--primary)]"
                aria-label="Open article"
              >
                <ExternalLink className="size-3" />
              </a>
            ) : null}
          </p>
        </div>
      ),
    },
    { key: "author", header: "Author", render: (row) => row.author?.name ?? "—" },
    {
      key: "published",
      header: "Published",
      sortKey: "publishedAt",
      render: (row) => (
        <span className="text-xs text-[var(--muted-foreground)]">
          {row.publishedAt ? formatDate(row.publishedAt) : "—"}
        </span>
      ),
    },
    { key: "views", header: "Views", sortKey: "viewCount", render: (row) => formatNumber(row.viewCount) },
    { key: "status", header: "Status", sortKey: "status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <RowActions>
          {canEdit ? (
            <Button variant="ghost" size="icon" onClick={() => setEditing(row)} aria-label="Edit article">
              <Pencil />
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="ghost" size="icon" onClick={() => setDeleting(row)} aria-label="Delete article">
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
        title="Blog"
        description="Buying guides and deal roundups published at /blog/[slug]."
        actions={
          canCreate ? (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              New article
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
        searchPlaceholder="Search articles…"
        filters={
          <FilterSelect
            value={list.filters.status as string}
            onChange={(value) => list.setFilter("status", value)}
            placeholder="All statuses"
            options={[
              { value: "draft", label: "Draft" },
              { value: "scheduled", label: "Scheduled" },
              { value: "published", label: "Published" },
              { value: "archived", label: "Archived" },
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
        emptyTitle="No articles yet"
        emptyDescription="Content brings organic traffic to your deals."
        emptyAction={
          canCreate ? (
            <Button onClick={() => setCreating(true)}>
              <BookOpen />
              Write the first article
            </Button>
          ) : undefined
        }
      />

      <ResourceDialog<BlogInput, BlogValues>
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
        title={editing ? "Edit article" : "New article"}
        endpoint="/api/admin/blog"
        recordId={editing?._id}
        schema={blogPostSchema}
        defaultValues={EMPTY}
        className="max-w-2xl"
        values={
          editing
            ? {
                title: editing.title,
                slug: editing.slug,
                excerpt: editing.excerpt ?? "",
                content: editing.content ?? "",
                featuredImage: editing.featuredImage ?? "",
                categories: [],
                tags: editing.tags ?? [],
                status: editing.status as BlogInput["status"],
                publishedAt: toDateTimeInput(editing.publishedAt),
                seo: editing.seo ?? { title: "", description: "", keywords: [], ogImage: "" },
              }
            : null
        }
      >
        {({ register, watch, setValue, formState: { errors } }) => (
          <>
            <Field label="Title" htmlFor="postTitle" error={errors.title?.message} required>
              <Input
                id="postTitle"
                {...register("title")}
                onBlur={(event) => {
                  if (!editing) setValue("slug", slugify(event.target.value));
                }}
              />
            </Field>

            <Field label="Slug" htmlFor="postSlug" error={errors.slug?.message} required>
              <Input id="postSlug" {...register("slug")} />
            </Field>

            <Field label="Excerpt" htmlFor="postExcerpt" error={errors.excerpt?.message}>
              <Textarea id="postExcerpt" rows={2} {...register("excerpt")} />
            </Field>

            <Field
              label="Content"
              htmlFor="postContent"
              hint="HTML is supported"
              error={errors.content?.message}
            >
              <Textarea id="postContent" rows={8} {...register("content")} />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <ImageField
                label="Featured image"
                folder="blog"
                aspect="wide"
                value={String(watch("featuredImage") ?? "")}
                onChange={(url) => setValue("featuredImage", url)}
                error={errors.featuredImage?.message}
                className="sm:col-span-2"
              />
              <Field
                label="Tags"
                htmlFor="postTags"
                hint="Comma separated"
                error={errors.tags?.message}
              >
                <Input
                  id="postTags"
                  defaultValue={(editing?.tags ?? []).join(", ")}
                  onChange={(event) =>
                    setValue(
                      "tags",
                      event.target.value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </Field>
              <Field label="Status" htmlFor="postStatus" error={errors.status?.message}>
                <NativeSelect id="postStatus" {...register("status")}>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </NativeSelect>
              </Field>
              <Field
                label="Publish date"
                htmlFor="postPublishedAt"
                hint="Required for scheduled posts"
                error={errors.publishedAt?.message}
              >
                <Input id="postPublishedAt" type="datetime-local" {...register("publishedAt")} />
              </Field>
            </div>

            <Field label="SEO title" htmlFor="postSeoTitle" error={errors.seo?.title?.message}>
              <Input id="postSeoTitle" {...register("seo.title")} />
            </Field>

            <Field
              label="SEO description"
              htmlFor="postSeoDescription"
              error={errors.seo?.description?.message}
            >
              <Textarea id="postSeoDescription" rows={2} {...register("seo.description")} />
            </Field>
          </>
        )}
      </ResourceDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this article?"
        description={`"${deleting?.title}" will be permanently removed.`}
        confirmLabel="Delete article"
        destructive
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
