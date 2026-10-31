/**
 * Creates (or resets) the demo store owner: a Pro store with no end date, so no
 * subscription is needed. Safe to re-run; it resets the password each time.
 *   npm run demo:seed
 */
import mongoose from "mongoose";

import connectToDatabase from "../src/lib/mongodb";
import bcrypt from "bcryptjs";
import StoreOwner from "../src/models/StoreOwner";
import Tenant from "../src/models/Tenant";
import { seedSampleProducts } from "../src/services/own-products.service";

const EMAIL = "demo@manadeals.online";
const PASSWORD = "Demo@12345";
const SLUG = "demo";

async function main() {
  await connectToDatabase();

  const owner = await StoreOwner.findOneAndUpdate(
    { email: EMAIL },
    {
      $set: {
        name: "Demo User",
        passwordHash: await bcrypt.hash(PASSWORD, 12),
        status: "active",
        failedLogins: 0,
        lockedUntil: null,
      },
      $setOnInsert: { email: EMAIL },
    },
    { upsert: true, new: true },
  );

  // plan "pro" with no planExpiresAt = granted by hand, never lapses.
  const tenant = await Tenant.findOneAndUpdate(
    { slug: SLUG },
    {
      $set: { name: "Demo Deals", owner: owner._id, plan: "pro", planExpiresAt: null, status: "active" },
      $setOnInsert: {
        slug: SLUG,
        branding: { tagline: "Best deals, handpicked for you", contactEmail: EMAIL },
        theme: { primary: "#0f766e", accent: "#ccfbf1", mode: "light" },
      },
    },
    { upsert: true, new: true },
  );

  owner.tenant = tenant._id;
  await owner.save();
  const seeded = await seedSampleProducts(String(tenant._id));
  if (seeded) console.log(`Added ${seeded} sample products`);

  console.log(`Demo ready. Login: ${EMAIL} / ${PASSWORD}  Store: ${tenant.slug} (${tenant.plan})`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
