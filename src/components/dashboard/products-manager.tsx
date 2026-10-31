"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Download, FileSpreadsheet, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { apiClient, ApiClientError, buildQuery } from "@/lib/api-client";
import type { Paginated } from "@/types";
import { formatCurrency } from "@/lib/utils/format";
import { parseCsv } from "@/lib/utils/csv";
import { MAX_IMPORT_ROWS, PRODUCT_CSV_TEMPLATE } from "@/lib/product-csv";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Pagination } from "@/components/ui/pagination";
import { Field } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUpload } from "@/components/dashboard/image-upload";

type Row = {
  _id: string;
  name: string;
  shortDescription: string;
  image: string;
  category: string;
  originalPrice: number;
  salePrice: number;
  availability: "in-stock" | "out-of-stock" | "limited" | "pre-order";
  status: "active" | "inactive";
  isSample: boolean;
  affiliateUrl: string;
};
type Draft = Omit<Row, "_id" | "isSample"> & { id: string | null };
type CategoryOption = { _id: string; name: string; parent: string | null };

const EMPTY: Draft = {
  id: null,
  name: "",
  shortDescription: "",
  image: "",
  category: "",
  originalPrice: 0,
  salePrice: 0,
  availability: "in-stock",
  status: "active",
  affiliateUrl: "",
};

const AVAILABILITY_OPTIONS = [
  { value: "in-stock", label: "In stock" },
  { value: "limited", label: "Limited stock" },
  { value: "out-of-stock", label: "Out of stock" },
  { value: "pre-order", label: "Pre-order" },
];
const VISIBILITY_OPTIONS = [
  { value: "active", label: "Visible on my store" },
  { value: "inactive", label: "Hidden" },
];

/** The owner's own products: list, add, edit, delete, and clear the dummy samples. */
export function ProductsManager() {
  const [result, setResult] = useState<Paginated<Row> | null>(null);
  const rows = result?.items ?? null;
  const [filters, setFilters] = useState({ search: "", category: "", availability: "", status: "", page: 1, limit: 20 });
  const [searchText, setSearchText] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<{ created: number; failedCount: number; failed: { row: number; error: string }[] } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    apiClient
      .get<Paginated<Row>>(`/api/owner/products${buildQuery(filters)}`)
      .then(setResult)
      .catch(() => setResult({ items: [], total: 0, page: 1, limit: filters.limit, totalPages: 1 }));
  }, [filters]);

  // Typing in the search box waits a moment, then goes back to page 1.
  useEffect(() => {
    const timer = setTimeout(() => setFilters((current) => (current.search === searchText.trim() ? current : { ...current, search: searchText.trim(), page: 1 })), 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiClient.get<CategoryOption[]>("/api/owner/options?type=categories").then(setCategories).catch(() => setCategories([]));
  }, []);

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const { id, ...body } = draft;
      if (id) await apiClient.put(`/api/owner/products/${id}`, body);
      else await apiClient.post("/api/owner/products", body);
      toast.success(id ? "Product updated" : "Product added");
      setDraft(null);
      load();
    } catch (error) {
      const detail = error instanceof ApiClientError && error.details ? Object.values(error.details)[0]?.[0] : "";
      toast.error(error instanceof ApiClientError ? `${error.message}${detail ? `: ${detail}` : ""}` : "Could not save the product");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    await apiClient.delete(`/api/owner/products/${id}`).then(load).catch(() => toast.error("Could not delete"));
  }

  async function clearSamples() {
    if (!confirm("Remove all sample products?")) return;
    await apiClient.delete("/api/owner/products").then(() => { toast.success("Sample products removed"); load(); }).catch(() => toast.error("Could not remove"));
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([PRODUCT_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "my-products-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(file: File) {
    setImporting(true);
    setReport(null);
    try {
      const parsed = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
      if (parsed.length === 0) throw new Error("The file has no rows");
      if (parsed.length > MAX_IMPORT_ROWS) throw new Error(`Import up to ${MAX_IMPORT_ROWS} products at a time`);
      const result = await apiClient.post<{ created: number; failedCount: number; failed: { row: number; error: string }[] }>(
        "/api/owner/products/import",
        { rows: parsed },
      );
      setReport(result);
      if (result.created > 0) {
        toast.success(`${result.created} products imported`);
        load();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const categoryOptions = categories.map((category) => ({ value: category._id, label: `${category.parent ? "— " : ""}${category.name}` }));
  const categoryName = (id: string) => categories.find((category) => category._id === id)?.name ?? "";
  const hasSamples = rows?.some((row) => row.isSample);

  if (draft) {
    const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft({ ...draft, [key]: value });
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">{draft.id ? "Edit product" : "Add a product"}</h2>
          <Field label="Product name" htmlFor="p-name" required>
            <Input id="p-name" value={draft.name} maxLength={120} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Short description" htmlFor="p-desc">
            <Textarea id="p-desc" rows={2} maxLength={200} value={draft.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Category" htmlFor="p-cat" required>
              <Combobox ariaLabel="Category" placeholder="Select a category" searchPlaceholder="Type a category…" value={draft.category} onChange={(value) => set("category", value)} options={categoryOptions} />
            </Field>
            <Field label="Availability" htmlFor="p-avail">
              <Combobox ariaLabel="Availability" value={draft.availability} onChange={(value) => set("availability", value as Draft["availability"])} options={AVAILABILITY_OPTIONS} />
            </Field>
            <Field label="Original price (₹)" htmlFor="p-orig" hint="MRP before discount">
              <Input id="p-orig" type="number" min={0} value={draft.originalPrice} onChange={(e) => set("originalPrice", Number(e.target.value))} />
            </Field>
            <Field label="Sale price (₹)" htmlFor="p-sale" required>
              <Input id="p-sale" type="number" min={0} value={draft.salePrice} onChange={(e) => set("salePrice", Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Your affiliate link" htmlFor="p-link" required hint="Where visitors go when they click Buy. Use your own tracked link.">
            <Input id="p-link" value={draft.affiliateUrl} placeholder="https://" onChange={(e) => set("affiliateUrl", e.target.value)} />
          </Field>
          <Field label="Product image" hint="Paste an image link, or upload a PNG / WebP (1 MB max)">
            <div className="space-y-2">
              <Input value={draft.image} placeholder="https://…/image.jpg" onChange={(e) => set("image", e.target.value)} />
              <ImageUpload kind="product" value={draft.image} onChange={(url) => set("image", url)} />
            </div>
          </Field>
          <Field label="Visibility" htmlFor="p-status">
            <Combobox ariaLabel="Visibility" value={draft.status} onChange={(value) => set("status", value as Draft["status"])} options={VISIBILITY_OPTIONS} />
          </Field>
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              {draft.id ? "Save changes" : "Add product"}
            </Button>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDraft({ ...EMPTY, category: categories[0]?._id ?? "" })}>
          <Plus />
          Add product
        </Button>
        <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={importing}>
          {importing ? <Loader2 className="animate-spin" /> : <Upload />}
          Import CSV
        </Button>
        <Button variant="outline" asChild>
          <a href="/api/owner/products/export" download>
            <Download />
            Export CSV
          </a>
        </Button>
        <Button variant="ghost" onClick={downloadTemplate}>
          <FileSpreadsheet />
          Download template
        </Button>
        <Button variant="outline" onClick={clearSamples}>
          Remove sample products
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importFile(file);
          }}
        />
      </div>

      {report ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
          <p className="font-medium">
            {report.created} imported{report.failedCount > 0 ? `, ${report.failedCount} skipped` : ""}.
          </p>
          {report.failed.length > 0 ? (
            <ul className="mt-2 max-h-48 list-disc space-y-0.5 overflow-auto pl-5 text-[var(--destructive)]">
              {report.failed.map((entry) => (
                <li key={entry.row}>
                  Row {entry.row}: {entry.error}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            Category names must match an existing category; rows with an unknown category go into the first one.
          </p>
        </div>
      ) : null}

      {hasSamples ? (
        <p className="rounded-md bg-[var(--muted)] p-3 text-sm text-[var(--muted-foreground)]">
          Your store starts with a few sample products so it never looks empty. Edit them to make them yours, or remove
          them once you have added your own.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input className="pl-9" placeholder="Search products…" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        </div>
        <Combobox className="w-52" ariaLabel="Category" placeholder="All categories" searchPlaceholder="Type a category…" value={filters.category} onChange={(value) => setFilters({ ...filters, category: value, page: 1 })} options={[{ value: "", label: "All categories" }, ...categoryOptions]} />
        <Combobox className="w-44" ariaLabel="Availability" value={filters.availability} onChange={(value) => setFilters({ ...filters, availability: value, page: 1 })} options={[{ value: "", label: "All stock" }, ...AVAILABILITY_OPTIONS]} />
        <Combobox className="w-44" ariaLabel="Visibility" value={filters.status} onChange={(value) => setFilters({ ...filters, status: value, page: 1 })} options={[{ value: "", label: "All products" }, { value: "active", label: "Visible" }, { value: "inactive", label: "Hidden" }, { value: "sample", label: "Samples" }]} />
        {filters.search || filters.category || filters.availability || filters.status ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchText("");
              setFilters({ ...filters, search: "", category: "", availability: "", status: "", page: 1 });
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      <Card>
        {result ? (
          <Pagination
            page={result.page}
            limit={result.limit}
            total={result.total}
            totalPages={result.totalPages}
            onPageChange={(page) => setFilters({ ...filters, page })}
            onLimitChange={(limit) => setFilters({ ...filters, limit, page: 1 })}
          />
        ) : null}
        <CardContent className="p-0">
          {rows === null ? (
            <p className="p-5 text-sm text-[var(--muted-foreground)]">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-5 text-sm text-[var(--muted-foreground)]">No products match. Add one, or clear the filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                    <th className="p-3">Product</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Availability</th>
                    <th className="p-3">Status</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row._id} className="border-b border-[var(--border)] last:border-0">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary owner-supplied image host */}
                          {row.image ? <img src={row.image} alt="" className="size-12 shrink-0 rounded-md bg-white object-contain" /> : <span className="size-12 shrink-0 rounded-md bg-[var(--muted)]" />}
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-medium">{row.name}</p>
                            {row.isSample ? <Badge variant="info">Sample</Badge> : null}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-[var(--muted-foreground)]">{categoryName(row.category)}</td>
                      <td className="p-3 whitespace-nowrap">
                        {formatCurrency(row.salePrice)} <span className="text-xs text-[var(--muted-foreground)] line-through">{formatCurrency(row.originalPrice)}</span>
                      </td>
                      <td className="p-3 capitalize">{row.availability.replace("-", " ")}</td>
                      <td className="p-3">
                        <Badge variant={row.status === "active" ? "success" : "neutral"}>{row.status === "active" ? "Visible" : "Hidden"}</Badge>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" aria-label="Edit" onClick={() => setDraft({ id: row._id, ...row })}>
                          <Pencil />
                        </Button>
                        <Button variant="ghost" size="sm" aria-label="Delete" onClick={() => remove(row._id)}>
                          <Trash2 />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        {result ? (
          <Pagination
            page={result.page}
            limit={result.limit}
            total={result.total}
            totalPages={result.totalPages}
            onPageChange={(page) => setFilters({ ...filters, page })}
            onLimitChange={(limit) => setFilters({ ...filters, limit, page: 1 })}
          />
        ) : null}
      </Card>
    </div>
  );
}
