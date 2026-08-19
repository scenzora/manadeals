"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, FileUp, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { parseCsv } from "@/lib/utils/csv";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Checkbox, Label } from "@/components/ui/form-field";
import { EmptyState } from "@/components/ui/states";

type PreviewRow = {
  index: number;
  name: string;
  status: "new" | "duplicate" | "invalid";
  message?: string;
  categoryResolved?: string;
  brandResolved?: string;
  networkResolved?: string;
  discountPercentage?: number;
};

type PreviewResponse = {
  rows: PreviewRow[];
  summary: { total: number; new: number; duplicate: number; invalid: number };
};

const TEMPLATE_HEADERS = [
  "name",
  "description",
  "category",
  "brand",
  "originalPrice",
  "salePrice",
  "affiliateNetwork",
  "affiliateUrl",
  "imageUrl",
  "rating",
  "reviewCount",
  "status",
];

const TEMPLATE_CSV = `${TEMPLATE_HEADERS.join(",")}
"Samsung Galaxy S24 5G","Flagship phone",Mobiles,Samsung,89999,66999,Amazon India,https://www.amazon.in/dp/EXAMPLE,https://picsum.photos/400,4.5,1200,active`;

export function ImportClient() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    const text = await file.text();
    const parsed = parseCsv(text);

    if (parsed.length === 0) {
      toast.error("That file has no data rows");
      return;
    }

    setFileName(file.name);
    setRows(parsed);
    setPreview(null);

    setBusy(true);
    try {
      const result = await apiClient.post<PreviewResponse>(
        "/api/admin/products/import?mode=preview",
        { rows: parsed },
      );
      setPreview(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that file");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!preview) return;
    setBusy(true);
    try {
      const validRows = rows.filter(
        (_row, index) => preview.rows.find((entry) => entry.index === index)?.status !== "invalid",
      );
      const result = await apiClient.post<{ created: number; skipped: number; errors: unknown[] }>(
        "/api/admin/products/import?mode=commit",
        { rows: validRows, skipDuplicates },
      );
      toast.success(`Imported ${result.created} product(s), skipped ${result.skipped}`);
      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "manadeals-product-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Import products"
        description="Upload a CSV, review what will be created, then commit the import."
        actions={
          <>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download />
              CSV template
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/products">
                <ArrowLeft />
                Back
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>1. Choose a file</CardTitle>
          <CardDescription>
            Required columns: {TEMPLATE_HEADERS.join(", ")}. Category and affiliate network are matched
            by name or slug and must already exist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-6 py-10 text-center transition-colors hover:border-[var(--primary)] hover:bg-[var(--accent)]/40"
          >
            <FileUp className="size-7 text-[var(--muted-foreground)]" />
            <span className="font-medium">{fileName || "Click to select a CSV file"}</span>
            <span className="text-xs text-[var(--muted-foreground)]">
              Up to 2,000 rows per import
            </span>
          </button>
        </CardContent>
      </Card>

      {preview ? (
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>2. Review</CardTitle>
              <CardDescription>Nothing is written until you confirm.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{preview.summary.new} new</Badge>
              <Badge variant="warning">{preview.summary.duplicate} duplicate</Badge>
              <Badge variant="danger">{preview.summary.invalid} invalid</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <TableWrapper>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>#</TH>
                    <TH>Product</TH>
                    <TH>Category</TH>
                    <TH>Network</TH>
                    <TH>Discount</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {preview.rows.slice(0, 200).map((row) => (
                    <TR key={row.index}>
                      <TD className="text-xs text-[var(--muted-foreground)]">{row.index + 1}</TD>
                      <TD>
                        <p className="font-medium">{row.name}</p>
                        {row.message ? (
                          <p className="text-xs text-[var(--muted-foreground)]">{row.message}</p>
                        ) : null}
                      </TD>
                      <TD>{row.categoryResolved ?? "—"}</TD>
                      <TD>{row.networkResolved ?? "—"}</TD>
                      <TD>
                        {row.discountPercentage !== undefined ? `${row.discountPercentage}%` : "—"}
                      </TD>
                      <TD>
                        {row.status === "new" ? (
                          <Badge variant="success">
                            <CheckCircle2 className="size-3" />
                            New
                          </Badge>
                        ) : row.status === "duplicate" ? (
                          <Badge variant="warning">Duplicate</Badge>
                        ) : (
                          <Badge variant="danger">
                            <TriangleAlert className="size-3" />
                            Invalid
                          </Badge>
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrapper>

            {preview.rows.length > 200 ? (
              <p className="text-xs text-[var(--muted-foreground)]">
                Showing the first 200 of {preview.rows.length} rows.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onCheckedChange={(checked) => setSkipDuplicates(checked === true)}
                />
                <Label htmlFor="skipDuplicates" className="cursor-pointer font-normal">
                  Skip duplicates (recommended)
                </Label>
              </div>
              <Button
                onClick={commit}
                loading={busy}
                disabled={preview.summary.new === 0 && (skipDuplicates || preview.summary.duplicate === 0)}
              >
                Import {skipDuplicates ? preview.summary.new : preview.summary.new + preview.summary.duplicate}{" "}
                product(s)
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : busy ? (
        <EmptyState title="Reading your file…" description="Validating rows against the catalogue." />
      ) : null}
    </div>
  );
}
