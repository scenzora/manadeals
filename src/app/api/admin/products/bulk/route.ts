import { adminRoute, fail, ok, readJson } from "@/lib/api";
import Product from "@/models/Product";
import { productBulkActionSchema } from "@/lib/validations/catalogue";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

const UPDATES: Record<string, Record<string, unknown>> = {
  activate: { status: "active" },
  deactivate: { status: "inactive" },
  feature: { isFeatured: true },
  unfeature: { isFeatured: false },
  trending: { isTrending: true },
};

export const POST = adminRoute("products.edit", async (request, { session }) => {
  const { ids, action } = productBulkActionSchema.parse(await readJson<unknown>(request));

  if (action === "delete") {
    // Deleting is a stronger permission than editing, so re-check it here.
    if (!hasPermission(session, "products.delete")) {
      return fail("You do not have permission to delete products", 403);
    }
    const result = await Product.deleteMany({ _id: { $in: ids } });
    await logActivity({
      session,
      action: "delete",
      module: "products",
      description: `Bulk deleted ${result.deletedCount} product(s)`,
      request,
      before: { ids },
    });
    return ok({ affected: result.deletedCount });
  }

  const update = UPDATES[action];
  if (!update) return fail("Unsupported bulk action", 422);

  const result = await Product.updateMany(
    { _id: { $in: ids } },
    { $set: { ...update, updatedBy: session.id } },
  );

  await logActivity({
    session,
    action: "update",
    module: "products",
    description: `Bulk "${action}" applied to ${result.modifiedCount} product(s)`,
    request,
    after: { ids, update },
  });

  return ok({ affected: result.modifiedCount });
});
