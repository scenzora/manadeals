import { adminRoute, fail, ok, readJson } from "@/lib/api";
import { presignSchema } from "@/lib/validations/media";
import { createUploadUrl } from "@/services/media.service";
import { isR2Configured, r2ConfigurationIssue } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Hands the browser a short-lived presigned PUT URL. The file itself goes
 * straight from the browser to R2 — the server only authorises it.
 */
export const POST = adminRoute("media.upload", async (request, { session }) => {
  if (!isR2Configured) {
    return fail(`Media storage is not configured. ${r2ConfigurationIssue()}`, 503);
  }

  // Presigned URLs are credentials; cap how fast one admin can mint them.
  const limited = rateLimit(`presign:${session.id}`, 60, 60_000);
  if (!limited.allowed) {
    return fail("Too many uploads at once. Please wait a moment.", 429);
  }

  const payload = presignSchema.parse(await readJson<unknown>(request));

  const result = await createUploadUrl({
    filename: payload.filename,
    mimeType: payload.mimeType,
    size: payload.size,
    folder: payload.folder,
    adminId: session.id,
  });

  return ok(result, 201);
});
