/**
 * seed-cache.ts
 *
 * Populates the burn cache by calling loadAndUpdateBurnCache().
 * Run this to initially seed the cache or to update it with new events.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { loadAndUpdateBurnCache } from "../src/lib/burn-cache";

async function main() {
  console.log("=".repeat(60));
  console.log("  BURN CACHE SEEDER");
  console.log("=".repeat(60));

  const cache = await loadAndUpdateBurnCache();

  console.log("\n" + "=".repeat(60));
  console.log("  DONE");
  console.log("=".repeat(60));
  console.log(`  Total events: ${cache.burnCount}`);
  console.log(`  Total burned: ${parseInt(cache.totalBurnedWei, 16) / 1e27} WTON`);
  console.log(`  Last block: ${cache.lastScannedBlock}`);
  console.log("=".repeat(60));
}

main().catch(console.error);
