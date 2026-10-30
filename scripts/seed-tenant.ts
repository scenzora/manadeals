/**
 * Creates (or updates) a demo store for local testing.
 *   npm run tenant:seed -- acme "Acme Deals" [pro]
 * Then open http://acme.localhost:3000 (with NEXT_PUBLIC_ROOT_DOMAIN=localhost).
 */
import mongoose from "mongoose";

import connectToDatabase from "../src/lib/mongodb";
import Tenant from "../src/models/Tenant";
import { isReservedSlug, isValidSlugFormat } from "../src/lib/tenant/host";

async function main() {
  const [slug, name, plan] = process.argv.slice(2).filter((arg) => arg !== "--");
  if (!slug || !name) throw new Error('Usage: npm run tenant:seed -- <slug> "<Store name>" [pro]');
  if (!isValidSlugFormat(slug) || isReservedSlug(slug)) throw new Error(`"${slug}" is not an allowed slug`);

  await connectToDatabase();
  const tenant = await Tenant.findOneAndUpdate(
    { slug },
    {
      $set: { name, status: "active", plan: plan === "pro" ? "pro" : "free" },
      $setOnInsert: { slug, theme: { primary: "#0f766e", accent: "#ccfbf1", mode: "auto" } },
    },
    { upsert: true, new: true },
  );
  console.log(`Store ready: ${tenant.slug} (${tenant.plan})`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
