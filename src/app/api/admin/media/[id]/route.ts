import { adminRoute, assertObjectId, fail, ok, readJson } from "@/lib/api";
import Media from "@/models/Media";
import { mediaUpdateSchema } from "@/lib/validations/media";
import { countReferences, deleteMedia } from "@/services/media.service";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

/** Detail plus a count of catalogue records still using the image. */
export const GET = adminRoute<{ id: string }>("media.view", async (_request, { params }) => {
  const { id } = await params;
  assertObjectId(id);

  const media = await Media.findById(id).populate({ path: "uploadedBy", select: "name" }).lean();
  if (!media) return fail("Media not found", 404);

  return ok({ media, references: await countReferences(media.url) });
});

export const PUT = adminRoute<{ id: string }>("media.upload", async (request, { params, session }) => {
  const { id } = await params;
  assertObjectId(id);

  const payload = mediaUpdateSchema.parse(await readJson<unknown>(request));
  const media = await Media.findByIdAndUpdate(id, { $set: payload }, { returnDocument: "after" }).lean();
  if (!media) return fail("Media not found", 404);

  await logActivity({
    session,
    action: "update",
    module: "media",
    recordId: id,
    description: `Updated media "${media.filename}"`,
    request,
    after: payload,
  });

  return ok(media);
});

export const DELETE = adminRoute<{ id: string }>("media.delete", async (request, { params, session }) => {
  const { id } = await params;
  assertObjectId(id);

  const existing = await Media.findById(id).lean();
  if (!existing) return fail("Media not found", 404);

  // Refuse by default when the image is still live on the storefront.
  const force = request.nextUrl.searchParams.get("force") === "true";
  const references = await countReferences(existing.url);
  if (references > 0 && !force) {
    return fail(
      `This image is still used by ${references} record(s). Replace it there first, or delete with force.`,
      409,
    );
  }

  const media = await deleteMedia(id);

  await logActivity({
    session,
    action: "delete",
    module: "media",
    recordId: id,
    description: `Deleted media "${media?.filename ?? id}"${references > 0 ? " (forced)" : ""}`,
    request,
    before: { key: media?.key, url: media?.url, references },
  });

  return ok({ deleted: true });
});
