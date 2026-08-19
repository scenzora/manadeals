"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  Clock,
  FileText,
  Menu,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { wikiPageSchema, WIKI_SECTIONS, type WikiPageInput, type WikiPageValues } from "@/lib/validations/wiki";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils/cn";
import { slugify } from "@/lib/utils/slug";
import { formatDate } from "@/lib/utils/format";
import { extractHeadings, readingMinutes, renderMarkdown } from "@/lib/utils/markdown";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, ToggleRow } from "@/components/ui/form-field";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResourceDialog } from "@/components/forms/resource-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import type { AdminSession, Paginated } from "@/types";

type WikiRow = {
  _id: string;
  title: string;
  slug: string;
  section: string;
  excerpt: string;
  content: string;
  tags: string[];
  order: number;
  isPinned: boolean;
  status: "draft" | "published";
  updatedAt: string;
  author?: { name: string } | null;
};

const EMPTY: WikiPageInput = {
  title: "",
  slug: "",
  section: "getting-started",
  excerpt: "",
  content: "",
  tags: [],
  order: 0,
  isPinned: false,
  status: "published",
};

const SECTION_LABEL = new Map<string, string>(
  WIKI_SECTIONS.map((section) => [section.value, section.label]),
);

export function WikiClient({ session }: { session: AdminSession }) {
  const [pages, setPages] = useState<WikiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  const [editing, setEditing] = useState<WikiRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<WikiRow | null>(null);
  const [busy, setBusy] = useState(false);

  const canCreate = hasPermission(session, "wiki.create");
  const canEdit = hasPermission(session, "wiki.edit");
  const canDelete = hasPermission(session, "wiki.delete");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Paginated<WikiRow>>(
        "/api/admin/wiki?limit=100&sort=order&order=asc",
      );
      setPages(data.items);
      setSelectedId((previous) =>
        previous && data.items.some((page) => page._id === previous)
          ? previous
          : (data.items[0]?._id ?? null),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the wiki");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return pages;
    return pages.filter((page) =>
      [page.title, page.excerpt, page.content, page.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [pages, search]);

  /** Pinned pages float to the top of their section. */
  const grouped = useMemo(() => {
    return WIKI_SECTIONS.map((section) => ({
      ...section,
      pages: filtered
        .filter((page) => page.section === section.value)
        .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || a.order - b.order),
    })).filter((section) => section.pages.length > 0);
  }, [filtered]);

  const selected = pages.find((page) => page._id === selectedId) ?? null;

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiClient.delete(`/api/admin/wiki/${deleting._id}`);
      toast.success(`Deleted "${deleting.title}"`);
      if (selectedId === deleting._id) setSelectedId(null);
      setDeleting(null);
      await load();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not delete the page");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Wiki"
        description="The team's internal handbook: processes, conventions and runbooks for ManaDeals."
        actions={
          <>
            <Button variant="outline" className="lg:hidden" onClick={() => setNavOpen((open) => !open)}>
              <Menu />
              Pages
            </Button>
            {canCreate ? (
              <Button onClick={() => setCreating(true)}>
                <Plus />
                New page
              </Button>
            ) : null}
          </>
        }
      />

      {error ? <ErrorState message={error} /> : null}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className={cn("space-y-3", navOpen ? "block" : "hidden lg:block")}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search the wiki…"
              className="pl-9"
            />
          </div>

          <Card>
            <CardContent className="max-h-[calc(100vh-15rem)] space-y-4 overflow-y-auto p-3">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-7 w-full" />
                  ))}
                </div>
              ) : grouped.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-[var(--muted-foreground)]">
                  {search ? "No pages match your search." : "No wiki pages yet."}
                </p>
              ) : (
                grouped.map((section) => (
                  <div key={section.value} className="space-y-1">
                    <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                      {section.label}
                    </p>
                    {section.pages.map((page) => (
                      <button
                        key={page._id}
                        onClick={() => {
                          setSelectedId(page._id);
                          setNavOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                          page._id === selectedId
                            ? "bg-[var(--accent)] font-medium text-[var(--accent-foreground)]"
                            : "hover:bg-[var(--muted)]",
                        )}
                      >
                        {page.isPinned ? (
                          <Pin className="size-3 shrink-0 text-[var(--primary)]" />
                        ) : (
                          <FileText className="size-3 shrink-0 text-[var(--muted-foreground)]" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{page.title}</span>
                        {page.status === "draft" ? (
                          <span className="shrink-0 text-[10px] uppercase text-[var(--muted-foreground)]">
                            draft
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </aside>

        <section>
          {loading ? (
            <Card>
              <CardContent className="space-y-3 p-6">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ) : !selected ? (
            <EmptyState
              icon={<BookMarked className="size-6" />}
              title="No page selected"
              description="Pick a page from the list, or write the first one."
              action={
                canCreate ? <Button onClick={() => setCreating(true)}>Create a page</Button> : undefined
              }
            />
          ) : (
            <WikiArticle
              page={selected}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={() => setEditing(selected)}
              onDelete={() => setDeleting(selected)}
            />
          )}
        </section>
      </div>

      <WikiEditor
        open={creating || Boolean(editing)}
        page={editing}
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
        title="Delete this wiki page?"
        description={`"${deleting?.title}" will be permanently removed from the handbook.`}
        confirmLabel="Delete page"
        destructive
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function WikiArticle({
  page,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  page: WikiRow;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const html = useMemo(() => renderMarkdown(page.content), [page.content]);
  const headings = useMemo(() => extractHeadings(page.content), [page.content]);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="navy">{SECTION_LABEL.get(page.section) ?? page.section}</Badge>
              {page.isPinned ? (
                <Badge variant="default">
                  <Pin className="size-3" />
                  Pinned
                </Badge>
              ) : null}
              {page.status === "draft" ? <StatusBadge status="draft" /> : null}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">{page.title}</h2>
            {page.excerpt ? (
              <p className="text-sm text-[var(--muted-foreground)]">{page.excerpt}</p>
            ) : null}
            <p className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {readingMinutes(page.content)} min read
              </span>
              <span>Updated {formatDate(page.updatedAt)}</span>
              {page.author?.name ? <span>by {page.author.name}</span> : null}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            {canEdit ? (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil />
                Edit
              </Button>
            ) : null}
            {canDelete ? (
              <Button variant="ghost" size="icon" aria-label="Delete page" onClick={onDelete}>
                <Trash2 className="text-[var(--destructive)]" />
              </Button>
            ) : null}
          </div>
        </div>

        {headings.length > 2 ? (
          <nav className="mb-6 rounded-lg bg-[var(--muted)] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              On this page
            </p>
            <ul className="space-y-1 text-sm">
              {headings.map((heading, index) => (
                <li key={`${heading.id}-${index}`} className={heading.level === 3 ? "pl-4" : undefined}>
                  <span className="text-[var(--foreground)]">{heading.text}</span>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {/* Content is Markdown rendered by renderMarkdown(), which escapes all
            HTML before formatting, so no author-supplied markup can execute. */}
        <article className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />

        {page.tags.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-4">
            {page.tags.map((tag) => (
              <Badge key={tag} variant="neutral">
                #{tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function WikiEditor({
  open,
  page,
  onClose,
  onSaved,
}: {
  open: boolean;
  page: WikiRow | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  return (
    <ResourceDialog<WikiPageInput, WikiPageValues>
      open={open}
      onClose={onClose}
      onSaved={onSaved}
      title={page ? "Edit wiki page" : "New wiki page"}
      description="Markdown is supported: headings, lists, tables, links, code and quotes."
      endpoint="/api/admin/wiki"
      recordId={page?._id}
      schema={wikiPageSchema}
      defaultValues={EMPTY}
      className="max-w-3xl"
      values={
        page
          ? {
              title: page.title,
              slug: page.slug,
              section: page.section as WikiPageInput["section"],
              excerpt: page.excerpt ?? "",
              content: page.content ?? "",
              tags: page.tags ?? [],
              order: page.order,
              isPinned: page.isPinned,
              status: page.status,
            }
          : null
      }
    >
      {({ register, watch, setValue, formState: { errors } }) => (
        <>
          <Field label="Title" htmlFor="wikiTitle" error={errors.title?.message} required>
            <Input
              id="wikiTitle"
              {...register("title")}
              onBlur={(event) => {
                if (!page) setValue("slug", slugify(event.target.value));
              }}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Slug" htmlFor="wikiSlug" error={errors.slug?.message} required>
              <Input id="wikiSlug" {...register("slug")} />
            </Field>
            <Field label="Section" htmlFor="wikiSection" error={errors.section?.message}>
              <NativeSelect id="wikiSection" {...register("section")}>
                {WIKI_SECTIONS.map((section) => (
                  <option key={section.value} value={section.value}>
                    {section.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <Field label="Summary" htmlFor="wikiExcerpt" error={errors.excerpt?.message}>
            <Input id="wikiExcerpt" {...register("excerpt")} />
          </Field>

          <Tabs defaultValue="write">
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="write">
              <Field htmlFor="wikiContent" error={errors.content?.message}>
                <Textarea
                  id="wikiContent"
                  rows={16}
                  className="font-mono text-xs"
                  placeholder={"## Heading\n\n- A bullet\n- Another bullet\n\n`code` and **bold**"}
                  {...register("content")}
                />
              </Field>
            </TabsContent>

            <TabsContent value="preview">
              <div className="max-h-96 overflow-y-auto rounded-lg border border-[var(--border)] p-4">
                <article
                  className="markdown-body"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(String(watch("content") ?? "")) }}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Tags" htmlFor="wikiTags" hint="Comma separated" error={errors.tags?.message}>
              <Input
                id="wikiTags"
                defaultValue={(page?.tags ?? []).join(", ")}
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
            <Field label="Order" htmlFor="wikiOrder" error={errors.order?.message}>
              <Input id="wikiOrder" type="number" min={0} {...register("order")} />
            </Field>
            <Field label="Status" htmlFor="wikiStatus" error={errors.status?.message}>
              <NativeSelect id="wikiStatus" {...register("status")}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </NativeSelect>
            </Field>
          </div>

          <ToggleRow
            label="Pin to the top of its section"
            description="Use for the pages people open most"
            checked={Boolean(watch("isPinned"))}
            onCheckedChange={(value) => setValue("isPinned", value)}
          />
        </>
      )}
    </ResourceDialog>
  );
}
