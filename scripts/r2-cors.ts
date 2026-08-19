/**
 * Applies the CORS policy the browser needs for direct-to-R2 uploads:
 *   npm run r2:cors           # show the current policy
 *   npm run r2:cors -- --apply  # write the policy below
 *
 * The admin uploads straight from the browser to R2 using a presigned PUT, so
 * the bucket has to allow PUT from the site origins. Without this every upload
 * fails with an opaque network error.
 */
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const BUCKET = process.env.R2_BUCKET ?? "";
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const ENDPOINT =
  process.env.R2_ENDPOINT || (ACCOUNT_ID ? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com` : "");

/** Extra origins can be supplied as R2_CORS_ORIGINS (comma separated). */
const ORIGINS = [
  "http://localhost:3000",
  "https://manadeals.online",
  "https://www.manadeals.online",
  ...(process.env.R2_CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

const RULES = [
  {
    AllowedOrigins: ORIGINS,
    AllowedMethods: ["GET", "PUT", "HEAD"],
    AllowedHeaders: ["content-type", "content-length"],
    ExposeHeaders: ["etag"],
    MaxAgeSeconds: 3600,
  },
];

async function main() {
  const apply = process.argv.includes("--apply");

  const client = new S3Client({
    region: "auto",
    endpoint: ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });

  if (apply) {
    await client.send(
      new PutBucketCorsCommand({ Bucket: BUCKET, CORSConfiguration: { CORSRules: RULES } }),
    );
    console.log(`Applied CORS to bucket "${BUCKET}":\n`);
    console.log(JSON.stringify(RULES, null, 2));
    return;
  }

  try {
    const current = await client.send(new GetBucketCorsCommand({ Bucket: BUCKET }));
    console.log(`Current CORS on "${BUCKET}":\n`);
    console.log(JSON.stringify(current.CORSRules, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`No CORS policy set on "${BUCKET}" (${message}).`);
  }

  console.log("\nRun with --apply to write this policy:\n");
  console.log(JSON.stringify(RULES, null, 2));
}

main().catch((error) => {
  console.error("R2 CORS command failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
