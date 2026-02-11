// ============================================================================
// Blockchain Service — Fetches transaction data, traces, and decodes calls
// Fixed: rate-limited Etherscan calls, proxy ABI resolution, known topic
//        decoding, Etherscan internal-tx fallback, token symbol resolution.
// ============================================================================

import {
  TransactionBasic,
  TransactionTrace,
  EventLog,
  InternalCall,
  BalanceChange,
  ContractInfo,
  DecodedParam,
} from "@/lib/types";
import { SUPPORTED_CHAINS, KNOWN_SIGNATURES, ETHERSCAN_API_KEY, ETHERSCAN_V2_BASE } from "@/lib/constants";
import { KNOWN_CONTRACTS, KNOWN_EVENT_ABIS } from "@/lib/known-contracts";
import { ethers } from "ethers";

// ── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Provider ─────────────────────────────────────────────────────────────────

const FALLBACK_RPCS: Record<string, string[]> = {
  ethereum: [
    "https://eth.llamarpc.com",
    "https://rpc.ankr.com/eth",
    "https://ethereum-rpc.publicnode.com",
    "https://1rpc.io/eth",
  ],
  polygon: [
    "https://polygon.llamarpc.com",
    "https://rpc.ankr.com/polygon",
    "https://polygon-bor-rpc.publicnode.com",
  ],
  arbitrum: [
    "https://arb1.arbitrum.io/rpc",
    "https://rpc.ankr.com/arbitrum",
  ],
  optimism: [
    "https://mainnet.optimism.io",
    "https://rpc.ankr.com/optimism",
  ],
  base: [
    "https://mainnet.base.org",
    "https://base-rpc.publicnode.com",
  ],
  bsc: [
    "https://bsc-dataseed.binance.org",
    "https://rpc.ankr.com/bsc",
  ],
};

function getProvider(chainId: string, fallbackIndex = 0): ethers.JsonRpcProvider {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);
  const rpcs = FALLBACK_RPCS[chainId] || [chain.rpcUrl];
  return new ethers.JsonRpcProvider(rpcs[fallbackIndex % rpcs.length]);
}

function getChain(chainId: string) {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);
  return chain;
}

// ── Global request-level throttle ────────────────────────────────────────────
// Etherscan free-tier key: 5 req/s burst, but aggressive throttling in practice.
// We serialise ALL Etherscan calls through a single queue to guarantee spacing.

let _lastEtherscanCall = 0;
const ETHERSCAN_MIN_GAP_MS = 550; // ≈ 1.8 req/s — well under the 5/s limit

async function etherscanFetch(url: string): Promise<Record<string, unknown>> {
  // Enforce minimum gap between any two Etherscan API calls
  const now = Date.now();
  const wait = ETHERSCAN_MIN_GAP_MS - (now - _lastEtherscanCall);
  if (wait > 0) await sleep(wait);
  _lastEtherscanCall = Date.now();

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    return (await res.json()) as Record<string, unknown>;
  } catch (err) {
    console.warn(`[Etherscan] fetch failed`, (err as Error).message);
    return { status: "0", result: null };
  } finally {
    clearTimeout(tid);
  }
}

// ── Persistent in-memory cache (survives across requests in dev mode) ────────

const _contractCache = new Map<string, RawContractData>();

// ── Contract Info (ABI + name) via getsourcecode (single call per address) ───

interface RawContractData {
  abi: string | null;
  name: string | null;
  verified: boolean;
  isProxy: boolean;
  implementationAddress: string | null;
}

const PROXY_CONTRACT_NAMES = [
  "TransparentUpgradeableProxy",
  "AdminUpgradeabilityProxy",
  "InitializableAdminUpgradeabilityProxy",
  "ERC1967Proxy",
  "BeaconProxy",
  "OwnedUpgradeabilityProxy",
];

async function fetchContractInfoSingle(
  address: string,
  chainId: string,
  maxRetries = 3,
): Promise<RawContractData> {
  const cacheKey = `${chainId}:${address.toLowerCase()}`;
  const cached = _contractCache.get(cacheKey);
  if (cached) {
    console.log(`[Etherscan] Cache hit for ${address.slice(0, 10)}…`);
    return cached;
  }

  const chain = getChain(chainId);
  const apiKey = ETHERSCAN_API_KEY;
  if (!apiKey) {
    const empty: RawContractData = { abi: null, name: null, verified: false, isProxy: false, implementationAddress: null };
    return empty;
  }

  const url = `${ETHERSCAN_V2_BASE}?chainid=${chain.chainId}&module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const data = await etherscanFetch(url);

    if (
      data.status === "1" &&
      Array.isArray(data.result) &&
      (data.result as Record<string, unknown>[])[0]
    ) {
      const info = (data.result as Record<string, string>[])[0];
      const isVerified = info.ABI !== "Contract source code not verified";
      const result: RawContractData = {
        abi: isVerified ? info.ABI : null,
        name: info.ContractName || null,
        verified: isVerified,
        isProxy: info.Proxy === "1",
        implementationAddress:
          info.Proxy === "1" && info.Implementation ? info.Implementation : null,
      };
      _contractCache.set(cacheKey, result);
      return result;
    }

    // Rate-limited — wait with exponential backoff and retry
    const resultStr = String(data.result || "");
    const isRateLimited =
      resultStr.includes("rate limit") ||
      resultStr.includes("Max rate") ||
      resultStr.includes("Max calls");

    if (isRateLimited && attempt < maxRetries - 1) {
      const backoff = 2000 * (attempt + 1); // 2s, 4s, 6s
      console.warn(`[Etherscan] Rate limited for ${address.slice(0, 10)}…, retry in ${backoff}ms (${attempt + 1}/${maxRetries})`);
      await sleep(backoff);
      continue;
    }

    // Log non-rate-limit errors for debugging
    if (!isRateLimited && data.message === "NOTOK") {
      console.warn(`[Etherscan] Error for ${address.slice(0, 10)}…: ${resultStr.slice(0, 100)}`);
    }

    // Not rate-limited — don't retry
    if (!isRateLimited) break;
  }

  const empty: RawContractData = { abi: null, name: null, verified: false, isProxy: false, implementationAddress: null };
  _contractCache.set(cacheKey, empty); // cache negatives too to avoid repeat lookups
  return empty;
}

/**
 * Fetch contract info for a list of addresses **sequentially** with rate
 * limiting (250 ms between calls). Uses getsourcecode which returns BOTH
 * the ABI and the contract name in a single API call.
 * For proxy contracts, automatically fetches the implementation ABI.
 */
async function fetchAllContractInfo(
  addresses: string[],
  chainId: string,
): Promise<{ abiCache: Map<string, string | null>; contractInfos: ContractInfo[] }> {
  const abiCache = new Map<string, string | null>();
  const contractInfos: ContractInfo[] = [];

  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i].toLowerCase();

    // Skip if already cached (e.g., from a prior batch)
    if (abiCache.has(addr)) continue;

    const known = KNOWN_CONTRACTS[addr];
    const info = await fetchContractInfoSingle(addr, chainId);

    let effectiveAbi = info.abi;
    let effectiveName = info.name;
    let isVerified = info.verified;

    // Handle proxy: fetch the implementation's ABI for proper decoding
    if (info.isProxy && info.implementationAddress) {
      const implInfo = await fetchContractInfoSingle(info.implementationAddress, chainId);
      if (implInfo.abi) effectiveAbi = implInfo.abi;
      if (
        implInfo.name &&
        (!effectiveName || PROXY_CONTRACT_NAMES.some((p) => effectiveName!.includes(p)))
      ) {
        effectiveName = implInfo.name;
      }
      if (implInfo.verified) isVerified = true;
    }

    // Known-contract names always win
    const displayName = known ? `${known.name} (${known.protocol})` : effectiveName;

    abiCache.set(addr, effectiveAbi);
    contractInfos.push({
      address: addr,
      name: displayName,
      verified: isVerified || !!known,
      abi: effectiveAbi,
    });

    // No extra sleep needed — etherscanFetch() enforces its own global throttle
  }

  return { abiCache, contractInfos };
}

// ── Etherscan Internal Transactions API ──────────────────────────────────────

interface EtherscanInternalTx {
  from: string;
  to: string;
  value: string;
  gas: string;
  gasUsed: string;
  input: string;
  type: string;
  isError: string;
  errCode: string;
  contractAddress: string;
  blockNumber: string;
  timeStamp: string;
}

async function fetchInternalTransactions(
  txHash: string,
  chainId: string,
): Promise<EtherscanInternalTx[]> {
  const chain = getChain(chainId);
  const apiKey = ETHERSCAN_API_KEY;
  if (!apiKey) return [];

  const url = `${ETHERSCAN_V2_BASE}?chainid=${chain.chainId}&module=account&action=txlistinternal&txhash=${txHash}&apikey=${apiKey}`;
  const data = await etherscanFetch(url);

  if (data.status === "1" && Array.isArray(data.result)) {
    return data.result as EtherscanInternalTx[];
  }
  return [];
}

// ── Decode helpers ───────────────────────────────────────────────────────────

function decodeMethodId(input: string): string {
  if (!input || input === "0x" || input.length < 10) return "";
  return input.slice(0, 10);
}

function getMethodName(methodId: string): string | null {
  return KNOWN_SIGNATURES[methodId] || null;
}

function tryDecodeWithABI(
  input: string,
  abiString: string,
): { name: string; params: DecodedParam[] } | null {
  try {
    const iface = new ethers.Interface(JSON.parse(abiString));
    const decoded = iface.parseTransaction({ data: input });
    if (!decoded) return null;
    return {
      name: decoded.name,
      params: decoded.fragment.inputs.map((inp, i) => ({
        name: inp.name || `param${i}`,
        type: inp.type,
        value: String(decoded.args[i]),
      })),
    };
  } catch {
    return null;
  }
}

function tryDecodeLogs(log: ethers.Log, abiString: string): EventLog | null {
  try {
    const iface = new ethers.Interface(JSON.parse(abiString));
    const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
    if (!parsed) return null;
    return {
      address: log.address,
      name: parsed.name,
      signature: parsed.signature,
      params: parsed.fragment.inputs.map((inp, i) => ({
        name: inp.name || `param${i}`,
        type: inp.type,
        value: String(parsed.args[i]),
      })),
      topic0: log.topics[0] || "",
    };
  } catch {
    return null;
  }
}

/** Decode an event using well-known topic0 signatures (no ABI needed). */
function tryDecodeFromKnownTopic(log: ethers.Log): EventLog | null {
  const topic0 = log.topics[0];
  if (!topic0) return null;
  const eventAbi = KNOWN_EVENT_ABIS[topic0];
  if (!eventAbi) return null;
  try {
    const iface = new ethers.Interface([eventAbi]);
    const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
    if (!parsed) return null;
    return {
      address: log.address,
      name: parsed.name,
      signature: parsed.signature,
      params: parsed.fragment.inputs.map((inp, i) => ({
        name: inp.name || `param${i}`,
        type: inp.type,
        value: String(parsed.args[i]),
      })),
      topic0,
    };
  } catch {
    return null;
  }
}

// ── Token symbol via RPC ─────────────────────────────────────────────────────

async function fetchTokenSymbol(
  address: string,
  provider: ethers.JsonRpcProvider,
): Promise<string | null> {
  try {
    const c = new ethers.Contract(
      address,
      ["function symbol() view returns (string)"],
      provider,
    );
    return await c.symbol();
  } catch {
    return null;
  }
}

// ── Retry helper ─────────────────────────────────────────────────────────────

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    const result = await fn();
    if (result !== null && result !== undefined) return result;
    if (i < retries - 1) await new Promise((r) => setTimeout(r, delay * (i + 1)));
  }
  return fn();
}

// ── Trace node parsing (for debug_traceTransaction) ─────────────────────────

interface RawTrace {
  type: string;
  from: string;
  to: string;
  value?: string;
  gas?: string;
  gasUsed?: string;
  input?: string;
  output?: string;
  error?: string;
  calls?: RawTrace[];
}

function collectTraceAddresses(node: RawTrace, out: Set<string>) {
  if (node.to) out.add(node.to.toLowerCase());
  if (node.from) out.add(node.from.toLowerCase());
  (node.calls || []).forEach((c) => collectTraceAddresses(c, out));
}

function parseTraceNode(
  node: RawTrace,
  depth: number,
  abiCache: Map<string, string | null>,
): InternalCall {
  const methodId = decodeMethodId(node.input || "");
  let methodName = getMethodName(methodId);
  let methodSignature: string | null = null;
  const decodedInput: DecodedParam[] = [];

  const abi = abiCache.get(node.to?.toLowerCase());
  if (abi && node.input) {
    const decoded = tryDecodeWithABI(node.input, abi);
    if (decoded) {
      methodName = decoded.name;
      methodSignature = KNOWN_SIGNATURES[methodId] || decoded.name;
      decodedInput.push(...decoded.params);
    }
  }
  if (!methodName && methodId) methodName = methodId;

  return {
    from: node.from || "",
    to: node.to || "",
    type: (node.type as InternalCall["type"]) || "CALL",
    value: node.value || "0x0",
    gasUsed: node.gasUsed || "0",
    input: node.input || "0x",
    output: node.output || "0x",
    methodName,
    methodSignature,
    decodedInput,
    decodedOutput: [],
    depth,
    children: (node.calls || []).map((c) => parseTraceNode(c, depth + 1, abiCache)),
    error: node.error || null,
  };
}

// ── Build call tree from Etherscan internal txs ─────────────────────────────

function buildCallTree(
  tx: { from: string; to: string; value: bigint; data: string; gasUsed: string },
  internalTxs: EtherscanInternalTx[],
  abiCache: Map<string, string | null>,
): InternalCall[] {
  const methodId = decodeMethodId(tx.data);
  let topMethodName = getMethodName(methodId) || methodId || "transfer";
  let topDecodedInput: DecodedParam[] = [];

  if (tx.to) {
    const abi = abiCache.get(tx.to.toLowerCase());
    if (abi) {
      const decoded = tryDecodeWithABI(tx.data, abi);
      if (decoded) {
        topMethodName = decoded.name;
        topDecodedInput = decoded.params;
      }
    }
  }

  const root: InternalCall = {
    from: tx.from,
    to: tx.to || "",
    type: "CALL",
    value: tx.value.toString(),
    gasUsed: tx.gasUsed,
    input: tx.data,
    output: "0x",
    methodName: topMethodName,
    methodSignature: KNOWN_SIGNATURES[methodId] || null,
    decodedInput: topDecodedInput,
    decodedOutput: [],
    depth: 0,
    children: [],
    error: null,
  };

  // Etherscan V2 doesn't provide traceId, so we reconstruct nesting
  // heuristically: if itx.from matches the "to" of the root or a previous
  // call, nest it as a child of that call; otherwise add as child of root.
  const callsByAddress = new Map<string, InternalCall>();
  callsByAddress.set((tx.to || "").toLowerCase(), root);

  for (const itx of internalTxs) {
    const itxMethodId = decodeMethodId(itx.input || "");
    let itxMethodName = getMethodName(itxMethodId) || itxMethodId || null;
    let itxDecodedInput: DecodedParam[] = [];
    const targetAddr = (itx.to || itx.contractAddress || "").toLowerCase();

    const abi = abiCache.get(targetAddr);
    if (abi && itx.input && itx.input !== "0x") {
      const decoded = tryDecodeWithABI(itx.input, abi);
      if (decoded) {
        itxMethodName = decoded.name;
        itxDecodedInput = decoded.params;
      }
    }

    const fromAddr = (itx.from || "").toLowerCase();
    const parent = callsByAddress.get(fromAddr) || root;

    const call: InternalCall = {
      from: itx.from || "",
      to: targetAddr,
      type: (itx.type?.toUpperCase() as InternalCall["type"]) || "CALL",
      value: itx.value || "0",
      gasUsed: itx.gasUsed || "0",
      input: itx.input || "0x",
      output: "0x",
      methodName: itxMethodName,
      methodSignature: KNOWN_SIGNATURES[itxMethodId] || null,
      decodedInput: itxDecodedInput,
      decodedOutput: [],
      depth: parent.depth + 1,
      children: [],
      error: itx.isError === "1" ? `Error code: ${itx.errCode}` : null,
    };

    parent.children.push(call);
    // Register this call's target so subsequent calls from it get nested
    if (targetAddr && !callsByAddress.has(targetAddr)) {
      callsByAddress.set(targetAddr, call);
    }
  }

  return [root];
}

// ── Count total calls (utility) ─────────────────────────────────────────────

function countCalls(calls: InternalCall[]): number {
  return calls.reduce((n, c) => n + 1 + countCalls(c.children), 0);
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function fetchTransactionTrace(
  txHash: string,
  chainId: string,
): Promise<TransactionTrace> {
  const rpcs = FALLBACK_RPCS[chainId] || [SUPPORTED_CHAINS.find((c) => c.id === chainId)!.rpcUrl];

  let lastError: Error | null = null;
  for (let rpcIndex = 0; rpcIndex < rpcs.length; rpcIndex++) {
    try {
      return await _fetchTrace(txHash, chainId, rpcIndex);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes("not found") && lastError.message.includes("hash")) {
        throw lastError;
      }
      console.warn(`RPC ${rpcs[rpcIndex]} failed, trying next…`, lastError.message);
    }
  }
  throw lastError || new Error("All RPCs failed");
}

// ── Core implementation ──────────────────────────────────────────────────────

async function _fetchTrace(
  txHash: string,
  chainId: string,
  rpcIndex: number,
): Promise<TransactionTrace> {
  const provider = getProvider(chainId, rpcIndex);
  const chain = getChain(chainId);
  console.log(`[TX] Fetching ${txHash} on ${chain.name}…`);

  // ── 1. Fetch basic tx + receipt ──
  const tx = await fetchWithRetry(() => provider.getTransaction(txHash));
  if (!tx) {
    throw new Error(
      `Transaction not found on ${chain.name}. Make sure the hash is correct and you selected the right chain.`,
    );
  }

  const receipt = await fetchWithRetry(() => provider.getTransactionReceipt(txHash), 4, 1500);
  if (!receipt) {
    throw new Error(
      `Transaction receipt not available on ${chain.name}. The transaction may be pending, or the RPC may be rate-limited. Try again in a moment.`,
    );
  }

  const block = await provider.getBlock(receipt.blockNumber);
  const timestamp = block?.timestamp || 0;

  const gasUsed = receipt.gasUsed.toString();
  const gasPrice = receipt.gasPrice?.toString() || tx.gasPrice?.toString() || "0";
  const gasCostWei = receipt.gasUsed * (receipt.gasPrice || tx.gasPrice || 0n);

  const methodId = decodeMethodId(tx.data);

  const basic: TransactionBasic = {
    hash: txHash,
    from: tx.from,
    to: tx.to,
    value: ethers.formatEther(tx.value),
    gasUsed,
    gasPrice,
    gasCostEth: ethers.formatEther(gasCostWei),
    gasCostUsd: null,
    blockNumber: receipt.blockNumber,
    timestamp,
    status: receipt.status === 1 ? "success" : "reverted",
    nonce: tx.nonce,
    input: tx.data,
    methodId,
  };

  // ── 2. Collect ALL addresses (tx + logs + internal txs) BEFORE ABI fetch ──
  const allAddresses = new Set<string>();
  if (tx.to) allAddresses.add(tx.to.toLowerCase());
  for (const log of receipt.logs) allAddresses.add(log.address.toLowerCase());

  // Try Etherscan internal transactions (works on all public RPCs)
  let etherscanInternalTxs: EtherscanInternalTx[] = [];
  try {
    etherscanInternalTxs = await fetchInternalTransactions(txHash, chainId);
    if (etherscanInternalTxs.length > 0) {
      console.log(`[TX] Got ${etherscanInternalTxs.length} internal txs from Etherscan`);
      for (const itx of etherscanInternalTxs) {
        const to = (itx.to || itx.contractAddress || "").toLowerCase();
        if (to) allAddresses.add(to);
        if (itx.from) allAddresses.add(itx.from.toLowerCase());
      }
    }
  } catch {
    console.warn("[TX] Failed to fetch internal transactions from Etherscan");
  }

  // Also attempt debug_traceTransaction (rare on public RPCs, but we cache the result)
  let rawTrace: RawTrace | null = null;
  try {
    rawTrace = await Promise.race<RawTrace | null>([
      provider.send("debug_traceTransaction", [
        txHash,
        { tracer: "callTracer", tracerConfig: { withLog: true } },
      ]),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
    ]);
    if (rawTrace) {
      collectTraceAddresses(rawTrace, allAddresses);
      console.log("[TX] debug_traceTransaction available");
    }
  } catch {
    // Not available — expected for public RPCs
  }

  console.log(`[TX] ${allAddresses.size} unique addresses to resolve`);

  // ── 3. Fetch contract info for ALL addresses (sequential, rate-limited) ──
  const { abiCache, contractInfos } = await fetchAllContractInfo(
    Array.from(allAddresses),
    chainId,
  );

  const verified = contractInfos.filter((c) => c.verified).length;
  console.log(`[TX] Contracts: ${verified}/${contractInfos.length} verified`);

  // ── 4. Decode events ──
  const events: EventLog[] = [];
  for (const log of receipt.logs) {
    const addr = log.address.toLowerCase();
    const abi = abiCache.get(addr);

    // Try 1: full ABI decode
    if (abi) {
      const decoded = tryDecodeLogs(log as ethers.Log, abi);
      if (decoded) { events.push(decoded); continue; }
    }
    // Try 2: known topic0 decode
    const knownDecode = tryDecodeFromKnownTopic(log as ethers.Log);
    if (knownDecode) { events.push(knownDecode); continue; }

    // Fallback: raw
    events.push({
      address: log.address,
      name: "Unknown Event",
      signature: "",
      params: [],
      topic0: log.topics[0] || "",
    });
  }

  const decodedEvents = events.filter((e) => e.name !== "Unknown Event").length;
  console.log(`[TX] Events: ${decodedEvents}/${events.length} decoded`);

  // ── 5. Build execution trace / call tree ──
  let internalCalls: InternalCall[];
  let traceSource: string;

  if (rawTrace) {
    // Best quality: debug_traceTransaction
    internalCalls = [parseTraceNode(rawTrace, 0, abiCache)];
    traceSource = "debug_trace";
  } else if (etherscanInternalTxs.length > 0) {
    // Good fallback: Etherscan internal transactions
    internalCalls = buildCallTree(
      { from: tx.from, to: tx.to || "", value: tx.value, data: tx.data, gasUsed },
      etherscanInternalTxs,
      abiCache,
    );
    traceSource = "etherscan_internal";
  } else {
    // Minimal fallback: just the top-level call
    const topMethodName =
      getMethodName(methodId) || (tx.to ? methodId || "transfer" : "contract creation");
    let topDecodedInput: DecodedParam[] = [];
    if (tx.to) {
      const abi = abiCache.get(tx.to.toLowerCase());
      if (abi) {
        const decoded = tryDecodeWithABI(tx.data, abi);
        if (decoded) topDecodedInput = decoded.params;
      }
    }
    internalCalls = [
      {
        from: tx.from,
        to: tx.to || "",
        type: "CALL",
        value: tx.value.toString(),
        gasUsed,
        input: tx.data,
        output: "0x",
        methodName: topMethodName,
        methodSignature: KNOWN_SIGNATURES[methodId] || null,
        decodedInput: topDecodedInput,
        decodedOutput: [],
        depth: 0,
        children: [],
        error: basic.status === "reverted" ? "Transaction reverted" : null,
      },
    ];
    traceSource = "minimal";
  }

  console.log(`[TX] Trace source: ${traceSource}, total calls: ${countCalls(internalCalls)}`);

  // ── 6. Resolve token symbols for balance changes ──
  const tokenSymbolCache = new Map<string, string>();
  const tokenAddresses = new Set<string>();
  for (const evt of events) {
    if (evt.name === "Transfer") tokenAddresses.add(evt.address.toLowerCase());
  }

  // Parallel RPC calls (no Etherscan rate limit concern)
  await Promise.all(
    Array.from(tokenAddresses).map(async (addr) => {
      const known = KNOWN_CONTRACTS[addr];
      if (known) { tokenSymbolCache.set(addr, known.name); return; }
      const ci = contractInfos.find((c) => c.address === addr);
      if (ci?.name && !PROXY_CONTRACT_NAMES.some((p) => ci.name!.includes(p))) {
        tokenSymbolCache.set(addr, ci.name); return;
      }
      const sym = await fetchTokenSymbol(addr, provider);
      if (sym) tokenSymbolCache.set(addr, sym);
    }),
  );

  // ── 7. Build balance changes ──
  const balanceChanges: BalanceChange[] = [];

  for (const event of events) {
    if (event.name !== "Transfer" || event.params.length < 3) continue;

    const from = event.params.find((p) => p.name === "from")?.value || "";
    const to = event.params.find((p) => p.name === "to")?.value || "";
    const value =
      event.params.find((p) => p.name === "value" || p.name === "amount")?.value || "0";
    const tokenSymbol =
      tokenSymbolCache.get(event.address.toLowerCase()) ||
      `Token (${event.address.slice(0, 8)}…)`;

    if (from.toLowerCase() === basic.from.toLowerCase()) {
      balanceChanges.push({
        address: from,
        token: event.address,
        tokenSymbol,
        tokenDecimals: 18,
        before: "N/A",
        after: "N/A",
        change: `-${value}`,
        isNative: false,
      });
    }
    if (to.toLowerCase() === basic.from.toLowerCase()) {
      balanceChanges.push({
        address: to,
        token: event.address,
        tokenSymbol,
        tokenDecimals: 18,
        before: "N/A",
        after: "N/A",
        change: `+${value}`,
        isNative: false,
      });
    }
  }

  // Native balance change
  if (parseFloat(basic.value) > 0) {
    balanceChanges.push({
      address: basic.from,
      token: "native",
      tokenSymbol: chain.nativeCurrency,
      tokenDecimals: 18,
      before: "N/A",
      after: "N/A",
      change: `-${basic.value}`,
      isNative: true,
    });
  }

  return { basic, events, internalCalls, balanceChanges, contracts: contractInfos };
}
