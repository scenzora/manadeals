/**
 * Idempotent "migration" for multi-tenant collections: creates any missing
 * indexes. Safe to re-run, and never touches existing documents.
 */
import "../src/models";
import mongoose from "mongoose";

import connectToDatabase from "../src/lib/mongodb";

async function main() {
  await connectToDatabase();
  for (const name of ["Tenant", "TenantDomain"]) {
    await mongoose.model(name).syncIndexes();
    console.log(`indexes synced: ${name}`);
  }
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
