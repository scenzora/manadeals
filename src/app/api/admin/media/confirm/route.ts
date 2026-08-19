import { adminRoute, assertObjectId, fail, ok, readJson } from "@/lib/api";
import Media from "@/models/Media";
import { confirmUploadSchema } from "@/lib/validations/media";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

/**
 * Called by the browser once the direct upload to R2 succeeds. Flips the row
 * from "pending" to "ready" and stores the pixel dimensions the browser
 * measured, so the library can show them without downloading each object.
 */
export const POST = adminRoute("media.upload", async (request, { session }) => {
  const payload = confirmUploadSchema.parse(await readJson<unknown>(request));
  assertObjectId(payload.id);

  const media = await Media.findOneAndUpdate(
    { _id: payload.id, uploadedBy: session.id },
    { $set: { status: "ready", width: payload.width, height: payload.height } },
    { returnDocument: "after" },
  ).lean();

  if (!media) return fail("Upload record not found", 404);

  await logActivity({
    session,
    action: "create",
    module: "media",
    recordId: payload.id,
    description: `Uploaded "${media.filename}"`,
    request,
    after: { key: media.key, size: media.size, folder: media.folder },
  });

  return ok(media);
});
