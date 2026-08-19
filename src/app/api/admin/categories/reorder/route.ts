import { adminRoute, ok, readJson } from "@/lib/api";
import Category from "@/models/Category";
import { categoryReorderSchema } from "@/lib/validations/catalogue";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

/** Persists the drag-and-drop ordering of the category tree in one round trip. */
export const POST = adminRoute("categories.edit", async (request, { session }) => {
  const { items } = categoryReorderSchema.parse(await readJson<unknown>(request));

  await Category.bulkWrite(
    items.map((item) => ({
      updateOne: { filter: { _id: item.id }, update: { $set: { order: item.order } } },
    })),
  );

  await logActivity({
    session,
    action: "update",
    module: "categories",
    description: `Reordered ${items.length} categories`,
    request,
    after: items,
  });

  return ok({ updated: items.length });
});
