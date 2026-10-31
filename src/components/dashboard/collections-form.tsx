"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, X } from "lucide-react";

import type { OwnerStore } from "@/lib/owner-page";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSection } from "@/components/dashboard/save";

type ProductOption = { _id: string; name: string; salePrice: number };
type Collection = { name: string; products: { id: string; name: string }[] };

const MAX_COLLECTIONS = 20;
const MAX_PRODUCTS = 100;

function swap<T>(list: T[], index: number, delta: number) {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

/** Owner-made categories: create, rename, reorder, and fill each with catalogue products in any order. */
export function CollectionsForm({ store }: { store: OwnerStore }) {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>(
    store.collections.map((entry) => ({ name: entry.name, products: entry.products })),
  );
  const [open, setOpen] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductOption[]>([]);
  const [busy, setBusy] = useState(false);

  const update = (index: number, patch: Partial<Collection>) =>
    setCollections((list) => list.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));

  async function search(term: string) {
    setQuery(term);
    const data = await apiClient
      .get<ProductOption[]>(`/api/owner/options?type=products&q=${encodeURIComponent(term)}`)
      .catch(() => []);
    setResults(data);
  }

  function addProduct(index: number, product: ProductOption) {
    const current = collections[index]!;
    if (current.products.some((entry) => entry.id === product._id) || current.products.length >= MAX_PRODUCTS) return;
    update(index, { products: [...current.products, { id: product._id, name: product.name }] });
  }

  async function save() {
    if (collections.some((entry) => !entry.name.trim())) {
      setOpen(collections.findIndex((entry) => !entry.name.trim()));
    }
    setBusy(true);
    const saved = await saveSection(
      {
        section: "collections",
        collections: collections.map((entry) => ({ name: entry.name.trim(), products: entry.products.map((p) => p.id) })),
      },
      "Categories saved",
    );
    setBusy(false);
    if (saved) router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--muted-foreground)]">
        Create your own categories, add products from the catalogue and put them in the order you like. When you have
        any, they replace the default category menu on your store.
      </p>

      {collections.map((collection, index) => (
        <div key={index} className="rounded-lg border border-[var(--border)]">
          <div className="flex flex-wrap items-center gap-2 p-3">
            <Input
              aria-label="Category name"
              className="min-w-40 flex-1"
              value={collection.name}
              maxLength={40}
              placeholder="Category name"
              onChange={(e) => update(index, { name: e.target.value })}
            />
            <span className="text-xs text-[var(--muted-foreground)]">{collection.products.length} products</span>
            <Button type="button" variant="ghost" size="sm" aria-label="Move up" disabled={index === 0} onClick={() => setCollections((l) => swap(l, index, -1))}>
              <ArrowUp />
            </Button>
            <Button type="button" variant="ghost" size="sm" aria-label="Move down" disabled={index === collections.length - 1} onClick={() => setCollections((l) => swap(l, index, 1))}>
              <ArrowDown />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { setOpen(open === index ? null : index); setQuery(""); setResults([]); }}>
              {open === index ? "Close" : "Edit products"}
            </Button>
            <Button type="button" variant="ghost" size="sm" aria-label="Delete category" onClick={() => { setCollections((l) => l.filter((_, i) => i !== index)); setOpen(null); }}>
              <Trash2 />
            </Button>
          </div>

          {open === index ? (
            <div className="space-y-3 border-t border-[var(--border)] p-3">
              {collection.products.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No products yet. Search below to add some.</p>
              ) : (
                <ol className="space-y-1">
                  {collection.products.map((product, position) => (
                    <li key={product.id} className="flex items-center gap-2 rounded-md bg-[var(--muted)] px-3 py-1.5 text-sm">
                      <span className="w-6 text-xs text-[var(--muted-foreground)]">{position + 1}</span>
                      <span className="line-clamp-1 flex-1">{product.name}</span>
                      <Button type="button" variant="ghost" size="sm" aria-label="Move up" disabled={position === 0} onClick={() => update(index, { products: swap(collection.products, position, -1) })}>
                        <ArrowUp />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" aria-label="Move down" disabled={position === collection.products.length - 1} onClick={() => update(index, { products: swap(collection.products, position, 1) })}>
                        <ArrowDown />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" aria-label="Remove product" onClick={() => update(index, { products: collection.products.filter((p) => p.id !== product.id) })}>
                        <X />
                      </Button>
                    </li>
                  ))}
                </ol>
              )}

              <Input placeholder="Search products to add…" value={query} onChange={(e) => search(e.target.value)} />
              {results.length > 0 && query ? (
                <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
                  {results.map((product) => {
                    const added = collection.products.some((entry) => entry.id === product._id);
                    return (
                      <li key={product._id}>
                        <button
                          type="button"
                          disabled={added}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--muted)] disabled:opacity-50"
                          onClick={() => addProduct(index, product)}
                        >
                          <span className="line-clamp-1">{product.name}</span>
                          <span className="text-xs text-[var(--muted-foreground)]">{added ? "Added" : `₹${product.salePrice}`}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {collections.length < MAX_COLLECTIONS ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCollections((list) => [...list, { name: "", products: [] }]);
              setOpen(collections.length);
            }}
          >
            <Plus />
            New category
          </Button>
        ) : null}
        <Button type="button" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          Save categories
        </Button>
      </div>
    </div>
  );
}
