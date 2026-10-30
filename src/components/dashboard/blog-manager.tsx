"use client";

import { useCallback, useEffect, useState } from "react";
import { Bold, Heading2, Italic, Link2, List, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { apiClient, ApiClientError } from "@/lib/api-client";
import { renderMarkdown } from "@/lib/utils/markdown";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/dashboard/image-upload";

type PostRow = { _id: string; title: string; status: "draft" | "published"; updatedAt: string };
type Draft = { id: string | null; title: string; excerpt: string; content: string; featuredImage: string; status: "draft" | "published" };

const EMPTY: Draft = { id: null, title: "", excerpt: "", content: "", featuredImage: "", status: "draft" };

const TOOLS = [
  { icon: Heading2, label: "Heading", before: "\n## ", after: "" },
  { icon: Bold, label: "Bold", before: "**", after: "**" },
  { icon: Italic, label: "Italic", before: "*", after: "*" },
  { icon: List, label: "List", before: "\n- ", after: "" },
  { icon: Link2, label: "Link", before: "[", after: "](https://)" },
];

/** Post list plus a Markdown editor with a toolbar and live preview. */
export function BlogManager() {
  const [posts, setPosts] = useState<PostRow[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiClient.get<PostRow[]>("/api/owner/blog").then(setPosts).catch(() => setPosts([]));
  }, []);
  useEffect(load, [load]);

  async function open(id: string) {
    const post = await apiClient.get<Draft & { _id: string }>(`/api/owner/blog/${id}`);
    setDraft({ id, title: post.title, excerpt: post.excerpt ?? "", content: post.content ?? "", featuredImage: post.featuredImage ?? "", status: post.status });
  }

  async function save(status: Draft["status"]) {
    if (!draft) return;
    setBusy(true);
    try {
      const { id, ...body } = draft;
      const payload = { ...body, status };
      if (id) await apiClient.put(`/api/owner/blog/${id}`, payload);
      else await apiClient.post("/api/owner/blog", payload);
      toast.success(status === "published" ? "Published" : "Draft saved");
      setDraft(null);
      load();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not save the post");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this post?")) return;
    await apiClient.delete(`/api/owner/blog/${id}`).catch(() => toast.error("Could not delete"));
    load();
  }

  function wrap(before: string, after: string) {
    const area = document.getElementById("post-content") as HTMLTextAreaElement | null;
    if (!area || !draft) return;
    const { selectionStart: start, selectionEnd: end, value } = area;
    const next = value.slice(0, start) + before + (value.slice(start, end) || "text") + after + value.slice(end);
    setDraft({ ...draft, content: next });
  }

  if (draft) {
    return (
      <div className="space-y-4">
        <Field label="Title" htmlFor="post-title">
          <Input id="post-title" value={draft.title} maxLength={140} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </Field>
        <Field label="Summary" htmlFor="post-excerpt" hint="Shown on the blog index and in search results">
          <Textarea id="post-excerpt" rows={2} maxLength={300} value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
        </Field>
        <Field label="Cover image">
          <ImageUpload kind="logo" value={draft.featuredImage} onChange={(featuredImage) => setDraft({ ...draft, featuredImage })} />
        </Field>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {TOOLS.map(({ icon: Icon, label, before, after }) => (
              <Button key={label} type="button" variant="outline" size="icon" aria-label={label} title={label} onClick={() => wrap(before, after)}>
                <Icon />
              </Button>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Textarea
              id="post-content"
              aria-label="Post content"
              rows={18}
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              className="font-mono text-xs"
            />
            <div
              className="markdown-body max-h-[28rem] overflow-auto rounded-md border border-[var(--border)] bg-[var(--card)] p-4"
              // renderMarkdown escapes input first, so this is safe to inject.
              dangerouslySetInnerHTML={{ __html: renderMarkdown(draft.content) }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || draft.title.trim().length < 3} onClick={() => save("published")}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            Publish
          </Button>
          <Button variant="outline" disabled={busy || draft.title.trim().length < 3} onClick={() => save("draft")}>
            Save draft
          </Button>
          <Button variant="ghost" onClick={() => setDraft(null)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setDraft(EMPTY)}>
        <Plus /> New post
      </Button>
      {posts === null ? <p className="text-sm text-[var(--muted-foreground)]">Loading…</p> : null}
      {posts?.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">No posts yet. Write your first one.</p> : null}
      <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--card)]">
        {posts?.map((post) => (
          <li key={post._id} className="flex items-center justify-between gap-3 px-4 py-3">
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => open(post._id)}>
              <p className="truncate text-sm font-medium">{post.title}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Updated {new Date(post.updatedAt).toLocaleDateString("en-IN")}</p>
            </button>
            <Badge variant={post.status === "published" ? "success" : "neutral"}>{post.status}</Badge>
            <Button variant="ghost" size="icon" aria-label="Delete post" onClick={() => remove(post._id)}>
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
