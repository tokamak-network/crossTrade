/**
 * burn-cache.ts
 * 
 * Persistent burn event cache with incremental scanning.
 * Cache stored in data/burn-cache.json tracks lastScannedBlock and all events.
 */

import fs from "fs";
import path from "path";
import { WTON_ADDRESS, WTON_DEPLOY_BLOCK, ETHERSCAN_V2_BASE, ETHERSCAN_API_KEY } from "./constants";
import type { BurnEvent } from "./types";

// ────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────

export interface CachedBurn {
  tx: string;
  from: string;
  amount: string; // hex wei
  block: number;
  ts: number;
}

export interface BurnCache {
  lastScannedBlock: number;
  totalBurnedWei: string; // hex
  burnCount: number;
  events: CachedBurn[];
  updatedAt: number;
}

// ────────────────────────────────────────────────────────────
//  Constants
// ────────────────────────────────────────────────────────────

const CACHE_FILE = path.join(process.cwd(), "data", "burn-cache.json");
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ZERO_TOPIC =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

// ────────────────────────────────────────────────────────────
//  Rate limiter – Etherscan free tier = 3 calls/sec
// ────────────────────────────────────────────────────────────

let lastCallTime = 0;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function etherscanGet(params: Record<string, string>): Promise<any> {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  const minInterval = 520; // ~2/sec to be safe
  if (elapsed < minInterval) {
    await sleep(minInterval - elapsed);
  }
  lastCallTime = Date.now();

  const qs = new URLSearchParams({
    chainid: "1",
    ...params,
    apikey: ETHERSCAN_API_KEY,
  });
  const url = `${ETHERSCAN_V2_BASE}?${qs}`;
  const res = await fetch(url);
  const json = await res.json();

  if (json.status === "0" && json.message === "No records found") {
    return [];
  }
  if (json.status !== "1") {
    // Check for rate limit
    if (String(json.result || json.message).toLowerCase().includes("rate limit")) {
      console.warn("[burn-cache] Hit rate limit, retrying in 2s...");
      await sleep(2000);
      return etherscanGet(params);
    }
    console.warn("[burn-cache] Etherscan error:", json);
    return [];
  }
  return json.result;
}

// ────────────────────────────────────────────────────────────
//  Cache file I/O
// ────────────────────────────────────────────────────────────

function loadCacheFromDisk(): BurnCache | null {
  if (!fs.existsSync(CACHE_FILE)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCacheToDisk(cache: BurnCache): void {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

// ────────────────────────────────────────────────────────────
//  Fetch burn events from Etherscan (paginated)
// ────────────────────────────────────────────────────────────

async function fetchBurnEvents(fromBlock: number, toBlock: number | string): Promise<CachedBurn[]> {
  const events: CachedBurn[] = [];
  let page = 1;
  const maxPages = 50; // safety

  while (page <= maxPages) {
    const logs = await etherscanGet({
      module: "logs",
      action: "getLogs",
      address: WTON_ADDRESS,
      topic0: TRANSFER_TOPIC,
      topic2: ZERO_TOPIC, // to = 0x0
      topic0_2_opr: "and",
      fromBlock: fromBlock.toString(),
      toBlock: toBlock.toString(),
      page: page.toString(),
      offset: "1000",
    });

    if (!Array.isArray(logs) || logs.length === 0) break;

    for (const log of logs) {
      events.push({
        tx: log.transactionHash,
        from: "0x" + log.topics[1].slice(26), // topic1 = from (left-padded)
        amount: log.data,
        block: parseInt(log.blockNumber, 16),
        ts: parseInt(log.timeStamp, 16),
      });
    }

    if (logs.length < 1000) break; // last page
    page++;
  }

  return events;
}

// ────────────────────────────────────────────────────────────
//  In-memory cache singleton (for same-process reuse)
// ────────────────────────────────────────────────────────────

let _memCache: BurnCache | null = null;

export async function loadAndUpdateBurnCache(): Promise<BurnCache> {
  // Return in-memory cache if recent
  if (_memCache && Date.now() - _memCache.updatedAt < 60_000) {
    return _memCache;
  }

  // Load from disk
  let cache = loadCacheFromDisk();
  if (!cache) {
    console.log("[burn-cache] No cache found, creating new cache from scratch");
    cache = {
      lastScannedBlock: WTON_DEPLOY_BLOCK - 1,
      totalBurnedWei: "0x0",
      burnCount: 0,
      events: [],
      updatedAt: Date.now(),
    };
  }

  // Fetch new events from lastScannedBlock + 1
  const fromBlock = cache.lastScannedBlock + 1;
  console.log(
    `[burn-cache] Scanning from block ${fromBlock} (${cache.burnCount} events cached, ${parseInt(cache.totalBurnedWei, 16) / 1e27} WTON total)`
  );

  const newEvents = await fetchBurnEvents(fromBlock, "latest");
  console.log(`[burn-cache] Fetched ${newEvents.length} new events`);

  if (newEvents.length > 0) {
    // Append new events
    cache.events.push(...newEvents);

    // Deduplicate by tx + from + amount (in case of overlaps)
    const uniqueMap = new Map<string, CachedBurn>();
    for (const ev of cache.events) {
      const key = `${ev.tx}-${ev.from}-${ev.amount}`;
      uniqueMap.set(key, ev);
    }
    cache.events = Array.from(uniqueMap.values()).sort((a, b) => a.block - b.block);

    // Recalculate totals from scratch
    let totalBurned = BigInt(0);
    for (const ev of cache.events) {
      totalBurned += BigInt(ev.amount);
    }
    cache.totalBurnedWei = "0x" + totalBurned.toString(16);
    cache.burnCount = cache.events.length;

    // Update lastScannedBlock
    cache.lastScannedBlock = Math.max(...cache.events.map((e) => e.block));
    cache.updatedAt = Date.now();

    // Write to disk
    writeCacheToDisk(cache);
    console.log(
      `[burn-cache] Done. ${newEvents.length} new events. Total: ${cache.burnCount} events, ${parseInt(cache.totalBurnedWei, 16) / 1e27} WTON burned. Last block: ${cache.lastScannedBlock}`
    );
  } else {
    console.log(
      `[burn-cache] Done. 0 new events. Total: ${cache.burnCount} events, ${parseInt(cache.totalBurnedWei, 16) / 1e27} WTON burned. Last block: ${cache.lastScannedBlock}`
    );
  }

  // Cache in memory
  _memCache = cache;
  return cache;
}

// ────────────────────────────────────────────────────────────
//  Convert cache to display format
// ────────────────────────────────────────────────────────────

export function cacheToDisplayData(cache: BurnCache): {
  events: BurnEvent[];
  totalBurned: number;
  burnCount: number;
} {
  const events: BurnEvent[] = cache.events.map((ev) => ({
    txHash: ev.tx,
    from: ev.from,
    to: "0x0000000000000000000000000000000000000000",
    amount: parseInt(ev.amount, 16) / 1e27,
    token: "WTON" as const,
    blockNumber: ev.block,
    timestamp: ev.ts,
    method: "swapToTON",
  }));

  const totalBurned = parseInt(cache.totalBurnedWei, 16) / 1e27;

  return {
    events,
    totalBurned,
    burnCount: cache.burnCount,
  };
}
