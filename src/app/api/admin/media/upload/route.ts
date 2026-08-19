import { PutObjectCommand } from "@aws-sdk/client-s3";

import { adminRoute, fail, ok } from "@/lib/api";
import Media from "@/models/Media";
import { getR2Client, isR2Configured, publicUrlForKey, r2ConfigurationIssue, R2_BUCKET } from "@/lib/r2";
import { buildObjectKey } from "@/services/media.service";
import { ALLOWED_MIME_TYPES, mediaFolderSchema } from "@/lib/validations/media";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

/**
 * Server-proxied upload: the browser posts the file here and the server streams
 * it to R2.
 *
 * The primary path is a presigned PUT straight from the browser (see
 * /api/admin/media/presign) because it avoids this hop entirely. This route is
 * the fallback for when the bucket has no CORS policy, which browsers surface
 * as an opaque network error. It is capped well below the serverless request
 * body limit.
 */
const MAX_PROXY_BYTES = 4 * 1024 * 1024;

export const POST = adminRoute("media.upload", async (request, { session }) => {
  if (!isR2Configured) {
    return fail(`Media storage is not configured. ${r2ConfigurationIssue()}`, 503);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("No file was submitted", 400);

  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return fail(`Unsupported file type: ${file.type || "unknown"}`, 422);
  }
  if (file.size > MAX_PROXY_BYTES) {
    return fail(
      `Files sent through the server must be 4 MB or smaller. Enable CORS on the bucket to upload larger files directly.`,
      413,
    );
  }

  const folder = mediaFolderSchema.catch("general").parse(form?.get("folder"));
  const key = buildObjectKey(file.name, file.type, folder);
  const body = new Uint8Array(await file.arrayBuffer());

  await getR2Client().send(
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body, ContentType: file.type }),
  );

  const media = await Media.create({
    key,
    url: publicUrlForKey(key),
    filename: file.name.slice(0, 200),
    mimeType: file.type,
    size: file.size,
    folder,
    uploadedBy: session.id,
    status: "ready",
  });

  await logActivity({
    session,
    action: "create",
    module: "media",
    recordId: String(media._id),
    description: `Uploaded "${media.filename}" (via server)`,
    request,
    after: { key, size: file.size, folder },
  });

  return ok(media.toObject(), 201);
});
