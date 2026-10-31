import crypto from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import { clientIp, fail, ok } from "@/lib/api";
import { ownerRoute, tenantIdOf } from "@/lib/owner-api";
import { rateLimit } from "@/lib/rate-limit";
import { getR2Client, isR2Configured, publicUrlForKey, r2ConfigurationIssue, R2_BUCKET } from "@/lib/r2";
import { checkBrandImage, MAX_BRAND_IMAGE_BYTES } from "@/lib/tenant/upload";

export const runtime = "nodejs";

/** Logo / favicon upload. Files are tiny (1 MB cap), so they go through the server where they can be inspected. */
export const POST = ownerRoute(async (request, { owner }) => {
  const tenantId = tenantIdOf(owner);

  const limit = rateLimit(`owner-upload:${owner.id}:${clientIp(request)}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) return fail("Upload limit reached. Try again later.", 429);

  if (!isR2Configured) return fail(`Media storage is not configured. ${r2ConfigurationIssue()}`, 503);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const rawKind = form?.get("kind");
  const kind = rawKind === "favicon" ? "favicon" : rawKind === "product" ? "product" : "logo";
  if (!(file instanceof File)) return fail("No file was submitted", 400);
  if (file.size > MAX_BRAND_IMAGE_BYTES) return fail("Images must be 1 MB or smaller", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkBrandImage(bytes);
  if (!check.ok) return fail(check.reason, 422);

  // The tenant id comes from the session, so a store can only write under its own prefix.
  const key = `stores/${tenantId}/${kind}-${crypto.randomBytes(5).toString("hex")}.${check.extension}`;
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: bytes,
      ContentType: check.mime,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return ok({ url: publicUrlForKey(key) }, 201);
});
