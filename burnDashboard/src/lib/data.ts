/**
 * data.ts
 * 
 * All blockchain data fetching (server-side only).
 * Uses persistent burn cache + Etherscan V2 API + RPC.
 */

import { ethers } from "ethers";
import {
  TON_ADDRESS,
  WTON_ADDRESS,
  DEAD_ADDRESS,
  ZERO_ADDRESS,
  ERC20_ABI,
  RPC_URL,
  ETHERSCAN_API_KEY,
  ETHERSCAN_V2_BASE,
  WTON_DEPLOY_BLOCK,
} from "./constants";
import type { BurnStats, BurnEvent, TokenHolder, LeaderboardEntry, SupplySnapshot } from "./types";
import { loadAndUpdateBurnCache, cacheToDisplayData } from "./burn-cache";

// ────────────────────────────────────────────────────────────
//  In-memory cache (5-min TTL)
// ────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    memCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  memCache.set(key, { data, timestamp: Date.now() });
}

// ────────────────────────────────────────────────────────────
//  RPC Provider
// ────────────────────────────────────────────────────────────

let provider: ethers.JsonRpcProvider | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(RPC_URL);
  }
  return provider;
}

// ────────────────────────────────────────────────────────────
//  Etherscan V2 – rate-limited fetch
// ────────────────────────────────────────────────────────────

let lastEtherscanCall = 0;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function etherscanGet(params: Record<string, string>): Promise<any> {
  const now = Date.now();
  const elapsed = now - lastEtherscanCall;
  const minInterval = 520; // ~2/sec to be safe
  if (elapsed < minInterval) {
    await sleep(minInterval - elapsed);
  }
  lastEtherscanCall = Date.now();

  const qs = new URLSearchParams({
    chainid: "1",
    ...params,
    apikey: ETHERSCAN_API_KEY,
  });
  const url = `${ETHERSCAN_V2_BASE}?${qs}`;
  const res = await fetch(url);
  const json = await res.json();

  if (json.status === "0" && json.message === "No records found") {
    console.warn("Etherscan V2 warning: No transactions found", params);
    return [];
  }
  if (json.status !== "1") {
    if (String(json.result || json.message).toLowerCase().includes("rate limit")) {
      console.warn("Etherscan V2 rate limit hit, retrying...");
      await sleep(2000);
      return etherscanGet(params);
    }
    console.error("Etherscan V2 error:", json);
    return [];
  }
  return json.result;
}

// ────────────────────────────────────────────────────────────
//  TON Supply & Balance
// ────────────────────────────────────────────────────────────

export async function getTONTotalSupply(): Promise<number> {
  const cached = getCached<number>("ton-supply");
  if (cached !== null) return cached;

  const provider = getProvider();
  const ton = new ethers.Contract(TON_ADDRESS, ERC20_ABI, provider);
  const supply = await ton.totalSupply() as bigint;
  const result = parseFloat(ethers.formatEther(supply));

  setCache("ton-supply", result);
  return result;
}

export async function getTONBalance(address: string): Promise<number> {
  const provider = getProvider();
  const ton = new ethers.Contract(TON_ADDRESS, ERC20_ABI, provider);
  const balance = await ton.balanceOf(address) as bigint;
  return parseFloat(ethers.formatEther(balance));
}

// ────────────────────────────────────────────────────────────
//  WTON Supply
// ────────────────────────────────────────────────────────────

export async function getWTONTotalSupply(): Promise<number> {
  const cached = getCached<number>("wton-supply");
  if (cached !== null) return cached;

  const provider = getProvider();
  const wton = new ethers.Contract(WTON_ADDRESS, ERC20_ABI, provider);
  const supply = await wton.totalSupply() as bigint;
  const result = parseFloat(ethers.formatUnits(supply, 27));

  setCache("wton-supply", result);
  return result;
}

// ────────────────────────────────────────────────────────────
//  WTON Burn Data (from persistent cache)
// ────────────────────────────────────────────────────────────

export async function getWTONBurnData(): Promise<{
  totalBurned: number;
  burnCount: number;
  events: BurnEvent[];
}> {
  const cache = await loadAndUpdateBurnCache();
  return cacheToDisplayData(cache);
}

// ────────────────────────────────────────────────────────────
//  Recent WTON Burns (last N events, optionally by address)
// ────────────────────────────────────────────────────────────

export async function getRecentWTONBurns(
  limit: number = 10,
  address?: string
): Promise<BurnEvent[]> {
  const { events } = await getWTONBurnData();

  let filtered = events;
  if (address) {
    const lowerAddr = address.toLowerCase();
    filtered = events.filter((e) => e.from.toLowerCase() === lowerAddr);
  }

  return filtered.slice(-limit).reverse();
}

// ────────────────────────────────────────────────────────────
//  Recent WTON Mints (Transfer FROM 0x0)
// ────────────────────────────────────────────────────────────

export async function getRecentWTONMints(limit: number = 10): Promise<BurnEvent[]> {
  const TRANSFER_TOPIC =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const ZERO_TOPIC =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  const logs = await etherscanGet({
    module: "logs",
    action: "getLogs",
    address: WTON_ADDRESS,
    topic0: TRANSFER_TOPIC,
    topic1: ZERO_TOPIC, // from = 0x0
    topic0_1_opr: "and",
    fromBlock: WTON_DEPLOY_BLOCK.toString(),
    toBlock: "latest",
    page: "1",
    offset: limit.toString(),
  });

  if (!Array.isArray(logs)) return [];

  return logs.map((log: any) => ({
    txHash: log.transactionHash,
    from: ZERO_ADDRESS,
    to: "0x" + log.topics[2].slice(26), // topic2 = to
    amount: parseInt(log.data, 16) / 1e27,
    token: "WTON" as const,
    blockNumber: parseInt(log.blockNumber, 16),
    timestamp: parseInt(log.timeStamp, 16),
    method: "swapFromTON",
  })).reverse();
}

// ────────────────────────────────────────────────────────────
//  Direct TON Burns (Transfer TO 0x0 – should be 0)
// ────────────────────────────────────────────────────────────

export async function getDirectBurnEvents(limit: number = 10): Promise<BurnEvent[]> {
  const TRANSFER_TOPIC =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const ZERO_TOPIC =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  const logs = await etherscanGet({
    module: "logs",
    action: "getLogs",
    address: TON_ADDRESS,
    topic0: TRANSFER_TOPIC,
    topic2: ZERO_TOPIC, // to = 0x0
    topic0_2_opr: "and",
    fromBlock: "0",
    toBlock: "latest",
    page: "1",
    offset: limit.toString(),
  });

  if (!Array.isArray(logs)) return [];

  return logs.map((log: any) => ({
    txHash: log.transactionHash,
    from: "0x" + log.topics[1].slice(26),
    to: ZERO_ADDRESS,
    amount: parseInt(log.data, 16) / 1e18,
    token: "TON" as const,
    blockNumber: parseInt(log.blockNumber, 16),
    timestamp: parseInt(log.timeStamp, 16),
    method: "burn",
  })).reverse();
}

// ────────────────────────────────────────────────────────────
//  Top Holders
// ────────────────────────────────────────────────────────────

export async function getTopHolders(limit: number = 10): Promise<TokenHolder[]> {
  // Mock data (Etherscan doesn't have a free API for top holders)
  return [];
}

// ────────────────────────────────────────────────────────────
//  Burn Stats (main dashboard card)
// ────────────────────────────────────────────────────────────

export async function getBurnStats(): Promise<BurnStats> {
  const cached = getCached<BurnStats>("burn-stats");
  if (cached !== null) return cached;

  // Fetch all data in SERIAL (to avoid rate limiting)
  const tonSupply = await getTONTotalSupply();
  await sleep(600);
  const wtonSupply = await getWTONTotalSupply();
  await sleep(600);
  const { totalBurned: wtonBurned, burnCount } = await getWTONBurnData();
  await sleep(600);
  const deadBalance = await getTONBalance(DEAD_ADDRESS);

  // TON locked in WTON contract (swapFromTON locks TON there)
  const tonLockedInWTON = await getTONBalance(WTON_ADDRESS);

  // Total WTON ever minted = current supply + burned
  const wtonTotalMinted = wtonSupply + wtonBurned;

  // Circulating = total supply - staked (mock for now)
  const circulatingSupply = tonSupply;

  // Burn percentage (capped at 99.9% for display)
  const burnPercentage = Math.min(
    (wtonBurned / wtonTotalMinted) * 100,
    99.9
  );

  // Mock price (use real API in production)
  const tonPrice = 1.5;
  const marketCap = tonSupply * tonPrice;

  const stats: BurnStats = {
    totalBurned: wtonBurned,
    totalBurnedUSD: wtonBurned * tonPrice,
    totalSupply: tonSupply,
    circulatingSupply,
    burnPercentage,
    tonPrice,
    marketCap,
    stakedTON: 0,
    wtonBurnCount: burnCount,
    wtonCurrentSupply: wtonSupply,
    wtonTotalMinted,
    deadAddressBalance: deadBalance,
  };

  setCache("burn-stats", stats);
  return stats;
}

// ────────────────────────────────────────────────────────────
//  Recent WTON Swaps (swapFromTON + swapToTON combined)
// ────────────────────────────────────────────────────────────

export async function getRecentWTONSwaps(limit: number = 10): Promise<BurnEvent[]> {
  const burns = await getRecentWTONBurns(limit);
  const mints = await getRecentWTONMints(limit);

  const combined = [...burns, ...mints].sort((a, b) => b.timestamp - a.timestamp);
  return combined.slice(0, limit);
}

// ────────────────────────────────────────────────────────────
//  Leaderboard
// ────────────────────────────────────────────────────────────

export async function getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
  const { events } = await getWTONBurnData();

  // Group by address
  const byAddress = new Map<string, { total: number; count: number; lastTs: number }>();

  for (const ev of events) {
    const addr = ev.from.toLowerCase();
    const existing = byAddress.get(addr) || { total: 0, count: 0, lastTs: 0 };
    existing.total += ev.amount;
    existing.count++;
    if (ev.timestamp > existing.lastTs) existing.lastTs = ev.timestamp;
    byAddress.set(addr, existing);
  }

  const entries: LeaderboardEntry[] = Array.from(byAddress.entries()).map(
    ([address, data]) => ({
      address,
      totalBurned: data.total,
      burnCount: data.count,
      badge: getBadge(data.total),
      lastBurnDate: data.lastTs,
    })
  );

  return entries.sort((a, b) => b.totalBurned - a.totalBurned).slice(0, limit);
}

function getBadge(amount: number): string {
  if (amount >= 1_000_000) return "🔥";
  if (amount >= 100_000) return "💎";
  if (amount >= 10_000) return "⭐";
  if (amount >= 1_000) return "🌟";
  return "🔸";
}

// ────────────────────────────────────────────────────────────
//  Supply History (mock for now)
// ────────────────────────────────────────────────────────────

export async function getSupplyHistory(days: number = 30): Promise<SupplySnapshot[]> {
  // Mock historical data (would need to query historical blocks in production)
  const snapshots: SupplySnapshot[] = [];
  const wtonSupply = await getWTONTotalSupply();
  const { totalBurned } = await getWTONBurnData();

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    snapshots.push({
      date: date.toISOString().split("T")[0],
      supply: wtonSupply,
      burned: totalBurned,
    });
  }

  return snapshots;
}
