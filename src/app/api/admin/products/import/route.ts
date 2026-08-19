import { adminRoute, ok, readJson } from "@/lib/api";
import { productImportRowSchema, productImportSchema } from "@/lib/validations/catalogue";
import { previewImport, runImport } from "@/services/product.service";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

/**
 * POST /api/admin/products/import
 *   ?mode=preview  → dry run, returns per-row status (default)
 *   ?mode=commit   → inserts the valid rows
 */
export const POST = adminRoute("products.create", async (request, { session }) => {
  const mode = request.nextUrl.searchParams.get("mode") ?? "preview";
  const body = await readJson<{ rows: unknown[]; skipDuplicates?: boolean }>(request);

  if (mode === "preview") {
    // Rows are validated individually so one bad row does not reject the file.
    const parsed = (body.rows ?? []).map((row, index) => {
      const result = productImportRowSchema.safeParse(row);
      return { index, row, result };
    });

    const validRows = parsed.filter((entry) => entry.result.success).map((entry) => entry.result.data!);
    const preview = await previewImport(validRows);

    const invalid = parsed
      .filter((entry) => !entry.result.success)
      .map((entry) => ({
        index: entry.index,
        name: (entry.row as { name?: string })?.name ?? `Row ${entry.index + 1}`,
        status: "invalid" as const,
        message: entry.result.error!.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      }));

    const rows = [...preview, ...invalid].sort((a, b) => a.index - b.index);

    return ok({
      rows,
      summary: {
        total: rows.length,
        new: rows.filter((row) => row.status === "new").length,
        duplicate: rows.filter((row) => row.status === "duplicate").length,
        invalid: rows.filter((row) => row.status === "invalid").length,
      },
    });
  }

  const { rows, skipDuplicates } = productImportSchema.parse(body);
  const result = await runImport(rows, { skipDuplicates, adminId: session.id });

  await logActivity({
    session,
    action: "import",
    module: "products",
    description: `Imported ${result.created} product(s), skipped ${result.skipped}`,
    request,
    after: { created: result.created, skipped: result.skipped, errors: result.errors.length },
  });

  return ok(result);
});
