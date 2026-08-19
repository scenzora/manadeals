import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 is S3-compatible, so the AWS SDK talks to it directly. Two
 * R2-specific details matter:
 *   - the region is always "auto"
 *   - the endpoint is account-scoped, not bucket-scoped
 *
 * Credentials are server-only: R2_* values are never exposed with NEXT_PUBLIC_.
 */
export const R2_BUCKET = process.env.R2_BUCKET || "manadeals";
export const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";

export const R2_ENDPOINT =
  process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "");

/** Public delivery origin — a custom domain, or the pub-*.r2.dev URL. */
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";

/** True when uploads can actually be performed. */
export const isR2Configured = Boolean(
  R2_ENDPOINT && R2_BUCKET && accessKeyId && secretAccessKey && R2_PUBLIC_URL,
);

/**
 * Explains exactly what is missing, so the admin UI can show something more
 * useful than a failed upload.
 */
export function r2ConfigurationIssue(): string | null {
  const missing: string[] = [];
  if (!R2_ACCOUNT_ID && !process.env.R2_ENDPOINT) missing.push("R2_ACCOUNT_ID");
  if (!R2_BUCKET) missing.push("R2_BUCKET");
  if (!accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!R2_PUBLIC_URL) missing.push("R2_PUBLIC_URL");

  return missing.length ? `Missing environment variable(s): ${missing.join(", ")}` : null;
}

let client: S3Client | null = null;

export function getR2Client() {
  if (!isR2Configured) {
    throw new Error(`Cloudflare R2 is not configured. ${r2ConfigurationIssue()}`);
  }

  // Cached across hot reloads and lambda invocations.
  client ??= new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId, secretAccessKey },
  });

  return client;
}

/** Builds the public URL for a stored object key. */
export function publicUrlForKey(key: string) {
  return `${R2_PUBLIC_URL}/${key.replace(/^\//, "")}`;
}

/** Recovers the object key from a public URL, or null if it is not ours. */
export function keyFromPublicUrl(url: string) {
  if (!R2_PUBLIC_URL || !url.startsWith(`${R2_PUBLIC_URL}/`)) return null;
  return url.slice(R2_PUBLIC_URL.length + 1);
}
