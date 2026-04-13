/**
 * check-burn-methods.ts
 *
 * For every burn event in the cache, fetch the transaction and check
 * the function selector (first 4 bytes of input data) to classify:
 *   - swapToTON(uint256)  → 0xf53fe70f  (unwrap, not a real burn)
 *   - burn(uint256)       → 0x42966c68  (direct burn, value destroyed)
 *   - burnFrom(addr,uint) → 0x79cc6790  (direct burn on behalf)
 *   - other selectors     → unknown
 *
 * Uses RPC batch calls for speed (20 per batch).
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { ethers } from "ethers";
import fs from "fs";
import path from "path";

const RPC_URL = process.env.RPC_URL || "";
const WTON = "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2".toLowerCase();

// Known method selectors (computed via keccak256)
const SELECTORS: Record<string, string> = {
  "0xf53fe70f": "swapToTON(uint256)",
  "0xe3b99e85": "swapToTONAndTransfer(address,uint256)",
  "0x42966c68": "burn(uint256)",
  "0x79cc6790": "burnFrom(address,uint256)",
  "0x3ccfd60b": "withdraw()",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // Load cache
  const cacheFile = path.join(process.cwd(), "data", "burn-cache.json");
  const cache = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
  const events = cache.events as Array<{ tx: string; from: string; amount: string; block: number; ts: number }>;

  console.log(`Cache has ${events.length} burn events`);
  console.log(`Fetching transaction data to classify method selectors...\n`);

  // Deduplicate txHashes (multiple burns can happen in 1 tx)
  const txMap = new Map<string, bigint>(); // txHash → total amount
  for (const e of events) {
    const prev = txMap.get(e.tx) || BigInt(0);
    txMap.set(e.tx, prev + BigInt(e.amount));
  }
  const uniqueTxHashes = Array.from(txMap.keys());
  console.log(`Unique transactions: ${uniqueTxHashes.length}`);

  // Fetch transactions via RPC
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const BATCH_SIZE = 20; // smaller batches to avoid rate limits
  const methodCounts: Record<string, { count: number; events: number; amount: bigint }> = {};
  let processed = 0;
  let directBurnTxs: Array<{ hash: string; method: string; amount: string }> = [];

  for (let i = 0; i < uniqueTxHashes.length; i += BATCH_SIZE) {
    const batch = uniqueTxHashes.slice(i, i + BATCH_SIZE);

    const txResults = await Promise.all(
      batch.map(async (hash) => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const tx = await provider.getTransaction(hash);
            if (tx) return tx;
            await sleep(300);
          } catch {
            await sleep(500);
          }
        }
        return null;
      })
    );

    for (let j = 0; j < batch.length; j++) {
      const tx = txResults[j];
      const hash = batch[j];
      const burnAmount = txMap.get(hash) || BigInt(0);

      let selector = "unknown";
      let methodName = "unknown";

      if (tx && tx.data) {
        selector = tx.data.slice(0, 10).toLowerCase();
        methodName = SELECTORS[selector] || `unknown(${selector})`;

        // Also check if the tx.to is WTON (direct call) vs some other contract (indirect)
        const isDirect = tx.to?.toLowerCase() === WTON;
        if (!isDirect) {
          methodName += " [indirect/via contract]";
        }
      }

      if (!methodCounts[methodName]) {
        methodCounts[methodName] = { count: 0, events: 0, amount: BigInt(0) };
      }
      methodCounts[methodName].count++;
      // Count events for this tx
      const eventsForTx = events.filter((e) => e.tx === hash).length;
      methodCounts[methodName].events += eventsForTx;
      methodCounts[methodName].amount += burnAmount;

      // Track direct burns
      if (selector === "0x42966c68" || selector === "0x79cc6790") {
        directBurnTxs.push({
          hash,
          method: methodName,
          amount: ethers.formatUnits(burnAmount, 27),
        });
      }
    }

    processed += batch.length;
    if (processed % 500 === 0 || processed === uniqueTxHashes.length) {
      console.log(`  Processed ${processed}/${uniqueTxHashes.length} transactions...`);
    }

    // Delay to avoid RPC rate limits
    if (i + BATCH_SIZE < uniqueTxHashes.length) {
      await sleep(500);
    }
  }

  // Print results
  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║              BURN EVENT METHOD BREAKDOWN                        ║");
  console.log("╠══════════════════════════════════════════════════════════════════╣");

  const sorted = Object.entries(methodCounts).sort((a, b) => b[1].count - a[1].count);
  for (const [method, data] of sorted) {
    const amountStr = parseFloat(ethers.formatUnits(data.amount, 27)).toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });
    console.log(`║  ${method}`);
    console.log(`║    Transactions: ${data.count}  |  Events: ${data.events}  |  Amount: ${amountStr} WTON`);
    console.log("║");
  }

  console.log("╠══════════════════════════════════════════════════════════════════╣");

  // Summarize
  const swapBurns = methodCounts["swapToTON(uint256)"] || { count: 0, events: 0, amount: BigInt(0) };
  const directBurns = (methodCounts["burn(uint256)"] || { count: 0, events: 0, amount: BigInt(0) });
  const directFromBurns = (methodCounts["burnFrom(address,uint256)"] || { count: 0, events: 0, amount: BigInt(0) });
  const realBurnAmount = directBurns.amount + directFromBurns.amount;
  const realBurnCount = directBurns.count + directFromBurns.count;

  console.log(`║  SWAP burns (swapToTON — gets TON back):  ${swapBurns.count} txs, ${parseFloat(ethers.formatUnits(swapBurns.amount, 27)).toLocaleString("en-US", { maximumFractionDigits: 0 })} WTON`);
  console.log(`║  REAL burns (burn/burnFrom — value destroyed):  ${realBurnCount} txs, ${parseFloat(ethers.formatUnits(realBurnAmount, 27)).toLocaleString("en-US", { maximumFractionDigits: 0 })} WTON`);
  console.log("╚══════════════════════════════════════════════════════════════════╝");

  if (directBurnTxs.length > 0) {
    console.log(`\n🔥 DIRECT BURN TRANSACTIONS (value permanently destroyed):`);
    for (const tx of directBurnTxs) {
      console.log(`  ${tx.hash}  ${tx.method}  ${tx.amount} WTON`);
    }
  } else {
    console.log("\n  No direct burn() or burnFrom() calls found — ALL burns were swapToTON (unwraps).");
  }
}

main().catch(console.error);
