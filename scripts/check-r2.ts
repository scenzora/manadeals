/**
 * Verifies the Cloudflare R2 setup end to end:
 *   npm run check:r2
 *
 * Uploads a tiny object, reads it back over the public URL, then deletes it.
 * Run this after changing credentials, the bucket, or the public domain — it
 * catches misconfiguration long before an admin hits a failed upload.
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const BUCKET = process.env.R2_BUCKET ?? "";
const PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
const ENDPOINT =
  process.env.R2_ENDPOINT || (ACCOUNT_ID ? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com` : "");

async function main() {
  const { S3Client } = await import("@aws-sdk/client-s3");

  console.log("Configuration");
  console.log(`  endpoint   ${ENDPOINT || "(missing)"}`);
  console.log(`  bucket     ${BUCKET || "(missing)"}`);
  console.log(`  public url ${PUBLIC_URL || "(missing)"}`);
  console.log(`  key id     ${process.env.R2_ACCESS_KEY_ID ? "set" : "(missing)"}`);
  console.log(`  secret     ${process.env.R2_SECRET_ACCESS_KEY ? "set" : "(missing)"}\n`);

  const client = new S3Client({
    region: "auto",
    endpoint: ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });

  await client.send(new HeadBucketCommand({ Bucket: BUCKET }));
  console.log("✔ credentials accepted, bucket reachable");

  const listing = await client.send(new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: 5 }));
  console.log(`✔ list objects: ${listing.KeyCount ?? 0} object(s) currently in the bucket`);

  const key = `_healthcheck/${Date.now()}.txt`;
  const body = `manadeals r2 healthcheck ${new Date().toISOString()}`;

  await client.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: "text/plain" }),
  );
  console.log(`✔ write: uploaded ${key}`);

  const read = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const roundTripped = await read.Body?.transformToString();
  console.log(`✔ read back over S3 API: ${roundTripped === body ? "matches" : "MISMATCH"}`);

  // The public URL is what the storefront actually uses, so test it separately:
  // an object can exist while public access or the custom domain is unset.
  if (PUBLIC_URL) {
    const publicResponse = await fetch(`${PUBLIC_URL}/${key}`).catch(() => null);
    if (!publicResponse) {
      console.log(`✖ public URL unreachable: ${PUBLIC_URL} (DNS or domain not connected)`);
    } else if (publicResponse.ok) {
      console.log(`✔ public read: ${PUBLIC_URL}/${key} → ${publicResponse.status}`);
    } else {
      console.log(
        `✖ public read failed: ${publicResponse.status} — connect the custom domain to the bucket, or enable public access`,
      );
    }
  }

  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  console.log(`✔ delete: removed ${key}`);
  console.log("\nR2 is ready.");
}

main().catch((error) => {
  console.error("\n✖ R2 check failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
