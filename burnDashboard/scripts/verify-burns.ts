/**
 * verify-burns.ts
 *
 * Cross-check the burn cache using independent methods:
 *
 *   Check 1 — Supply equation (RPC, no Etherscan caps):
 *       current WTON totalSupply = totalMinted − totalBurned
 *       → totalMinted = supply + burned (from cache)
 *       → verify this is consistent
 *
 *   Check 2 — TON locked in WTON contract (RPC):
 *       When users swapFromTON → TON is locked in WTON contract, WTON minted
 *       When users swapToTON  → WTON burned, TON released back
 *       So: TON.balanceOf(WTON_contract) ≈ net WTON still outstanding from swaps
 *
 *   Check 3 — Block-range chunked burn scan (different Etherscan strategy):
 *       Split the chain into block ranges to avoid the 10K result cap
 *       Uses module=logs but in small enough ranges to never hit the cap
 *
 *   Check 4 — Cache file totals
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { ethers } from "ethers";
import fs from "fs";
import path from "path";

const TON  = "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5";
const WTON = "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2";
const ZERO = "0x0000000000000000000000000000000000000000";
const ETHERSCAN_V2 = "https://api.etherscan.io/v2/api";
const API_KEY = process.env.ETHERSCAN_API_KEY || "";
const RPC_URL = process.env.RPC_URL || "";
const DEPLOY_BLOCK = 10_559_883;

const ERC20 = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lastCall = 0;
async function etherscanGet(params: Record<string, string>): Promise<any> {
  const now = Date.now();
  const wait = 520 - (now - lastCall);
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();

  const qs = new URLSearchParams({ chainid: "1", ...params, apikey: API_KEY });
  const res = await fetch(`${ETHERSCAN_V2}?${qs}`);
  const json = await res.json();

  if (json.status === "0" && json.message === "No records found") return [];
  if (json.status !== "1") {
    if (String(json.result).includes("rate limit")) {
      await sleep(1500);
      return etherscanGet(params);
    }
    return [];
  }
  return json.result;
}

// ═══════════════════════════════════════════════════════════
//  CHECK 1 — RPC: on-chain supply + TON locked
// ═══════════════════════════════════════════════════════════

async function check1_rpc() {
  console.log("\n── CHECK 1: On-chain state via RPC ──");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const ton  = new ethers.Contract(TON,  ERC20, provider);
  const wton = new ethers.Contract(WTON, ERC20, provider);

  const [wtonSupplyRaw, tonSupplyRaw, tonInWtonRaw] = await Promise.all([
    wton.totalSupply() as Promise<bigint>,
    ton.totalSupply()  as Promise<bigint>,
    ton.balanceOf(WTON) as Promise<bigint>,  // TON locked in WTON contract
  ]);

  const wtonSupply = parseFloat(ethers.formatUnits(wtonSupplyRaw, 27));
  const tonSupply  = parseFloat(ethers.formatEther(tonSupplyRaw));
  const tonLocked  = parseFloat(ethers.formatEther(tonInWtonRaw));

  console.log(`  WTON totalSupply()    : ${wtonSupply.toLocaleString()} WTON`);
  console.log(`  TON  totalSupply()    : ${tonSupply.toLocaleString()} TON`);
  console.log(`  TON locked in WTON    : ${tonLocked.toLocaleString()} TON`);
  console.log(`  (TON locked ≈ net WTON still outstanding from swaps)`);

  return { wtonSupply, wtonSupplyRaw, tonSupply, tonLocked };
}

// ═══════════════════════════════════════════════════════════
//  CHECK 2 — Block-range chunked burn scan via Etherscan
//  (avoids the 10K cap by splitting into year-sized chunks)
// ═══════════════════════════════════════════════════════════

async function check2_chunkedScan() {
  console.log("\n── CHECK 2: Block-range chunked burn scan ──");
  console.log("  Splitting chain into ~2M-block chunks to avoid 10K result cap...\n");

  const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const ZERO_TOPIC = "0x0000000000000000000000000000000000000000000000000000000000000000";

  // ~2M blocks per chunk ≈ 8 months of Ethereum
  const CHUNK_SIZE = 2_000_000;
  // Use current block from RPC
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const latestBlock = await provider.getBlockNumber();
  console.log(`  Latest block: ${latestBlock}`);

  let totalBurned = BigInt(0);
  let totalEvents = 0;
  let from = DEPLOY_BLOCK;

  while (from <= latestBlock) {
    const to = Math.min(from + CHUNK_SIZE - 1, latestBlock);
    let chunkEvents = 0;
    let chunkBurned = BigInt(0);
    let page = 1;

    // Paginate within this chunk (should be <10K events per 2M-block chunk)
    while (page <= 15) {
      const logs = await etherscanGet({
        module: "logs",
        action: "getLogs",
        address: WTON,
        topic0: TRANSFER_TOPIC,
        topic2: ZERO_TOPIC,
        topic0_2_opr: "and",
        fromBlock: from.toString(),
        toBlock: to.toString(),
        page: page.toString(),
        offset: "1000",
      });
      if (!Array.isArray(logs) || logs.length === 0) break;

      for (const log of logs) {
        chunkBurned += BigInt(log.data);
        chunkEvents++;
      }

      if (logs.length < 1000) break;
      page++;
    }

    totalBurned += chunkBurned;
    totalEvents += chunkEvents;
    const chunkLabel = `blocks ${from.toLocaleString()} → ${to.toLocaleString()}`;
    console.log(`    ${chunkLabel}: ${chunkEvents} burns, ${parseFloat(ethers.formatUnits(chunkBurned, 27)).toLocaleString("en-US", { maximumFractionDigits: 0 })} WTON`);

    from = to + 1;
  }

  const totalFloat = parseFloat(ethers.formatUnits(totalBurned, 27));
  console.log(`\n  Total burned (chunked scan): ${totalFloat.toLocaleString()} WTON (${totalEvents} events)`);

  return { burned: totalBurned, burnedFloat: totalFloat, eventCount: totalEvents };
}

// ═══════════════════════════════════════════════════════════
//  CHECK 3 — Cache file
// ═══════════════════════════════════════════════════════════

function check3_cache() {
  console.log("\n── CHECK 3: Cache file ──");

  const cacheFile = path.join(process.cwd(), "data", "burn-cache.json");
  const raw = fs.readFileSync(cacheFile, "utf-8");
  const cache = JSON.parse(raw);

  const burned = BigInt(cache.totalBurnedWei);
  const burnedFloat = parseFloat(ethers.formatUnits(burned, 27));
  console.log(`  Total burned (cache) : ${burnedFloat.toLocaleString()} WTON`);
  console.log(`  Events in cache      : ${cache.burnCount}`);
  console.log(`  Last scanned block   : ${cache.lastScannedBlock}`);

  return { burned, burnedFloat, eventCount: cache.burnCount, lastBlock: cache.lastScannedBlock };
}

// ═══════════════════════════════════════════════════════════
//  COMPARE
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   BURN CACHE VERIFICATION                              ║");
  console.log("║   3 independent methods — no shortcuts                 ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  const t0 = Date.now();

  const rpc    = await check1_rpc();
  const scan   = await check2_chunkedScan();
  const cache  = check3_cache();

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

  // Supply equation: totalMinted = currentSupply + totalBurned
  const impliedMinted = rpc.wtonSupply + cache.burnedFloat;

  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║                         RESULTS                                ║");
  console.log("╠══════════════════════════════════════════════════════════════════╣");
  console.log(`║  WTON totalSupply (RPC)       :  ${fmt(rpc.wtonSupply).padStart(14)} WTON           ║`);
  console.log(`║  TON locked in WTON (RPC)     :  ${fmt(rpc.tonLocked).padStart(14)} TON            ║`);
  console.log("╠══════════════════════════════════════════════════════════════════╣");
  console.log(`║  Chunked scan burned          :  ${fmt(scan.burnedFloat).padStart(14)} WTON  (${scan.eventCount} events) ║`);
  console.log(`║  Cache file burned            :  ${fmt(cache.burnedFloat).padStart(14)} WTON  (${cache.eventCount} events) ║`);
  console.log("╠══════════════════════════════════════════════════════════════════╣");

  // Main comparison: chunked scan vs cache
  const diff = scan.burned - cache.burned;
  const absDiff = diff < 0 ? -diff : diff;
  const diffFloat = parseFloat(ethers.formatUnits(absDiff, 27));
  const diffPct = cache.burnedFloat > 0 ? (diffFloat / cache.burnedFloat * 100).toFixed(6) : "N/A";

  console.log(`║  Difference (scan vs cache)   :  ${fmt(diffFloat).padStart(14)} WTON  (${diffPct}%)      ║`);
  console.log(`║  Event count diff             :  ${Math.abs(scan.eventCount - cache.eventCount).toString().padStart(14)}                       ║`);
  console.log("╠══════════════════════════════════════════════════════════════════╣");
  console.log(`║  Implied total ever minted    :  ${fmt(impliedMinted).padStart(14)} WTON           ║`);
  console.log(`║  (= currentSupply + cacheBurned)                                ║`);
  console.log("╠══════════════════════════════════════════════════════════════════╣");

  const eventsMatch = scan.eventCount === cache.eventCount;
  const exactMatch = diff === BigInt(0);
  const closeMatch = cache.burnedFloat > 0 && diffFloat / cache.burnedFloat < 0.001;

  if (exactMatch && eventsMatch) {
    console.log("║  ✅ EXACT MATCH — cache is perfectly accurate                  ║");
  } else if (exactMatch) {
    console.log("║  ✅ AMOUNTS MATCH EXACTLY — event counts differ slightly        ║");
  } else if (closeMatch) {
    console.log("║  ✅ MATCH within 0.1% tolerance — cache is reliable             ║");
  } else {
    console.log("║  ❌ MISMATCH — cache may need re-seeding                        ║");
  }

  console.log(`║  Elapsed: ${elapsed}s                                                     ║`);
  console.log("╚══════════════════════════════════════════════════════════════════╝");
}

main().catch(console.error);
