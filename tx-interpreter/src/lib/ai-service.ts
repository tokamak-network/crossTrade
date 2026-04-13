// ============================================================================
// AI Service — Calls Tokamak LiteLLM proxy for transaction interpretation
// All models accessed via a single OpenAI-compatible endpoint.
// Enriched prompts with contract labels, protocol detection, decoded data.
// ============================================================================

import {
  TransactionTrace,
  InterpretationResult,
  UserModeInterpretation,
  DevModeInterpretation,
} from "@/lib/types";
import { KNOWN_CONTRACTS, detectProtocols, getContractLabel, resolveLayerZeroChainId, LAYERZERO_CHAIN_IDS } from "@/lib/known-contracts";
import OpenAI from "openai";

// ---------- LiteLLM Client (singleton) ----------

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.LITELLM_API_KEY;
  const baseURL = process.env.LITELLM_BASE_URL || "https://api.ai.tokamak.network";
  if (!apiKey) throw new Error("LITELLM_API_KEY is not set. Add it to your .env.local file.");
  _client = new OpenAI({ apiKey, baseURL });
  return _client;
}

// ---------- Context Enrichment ----------

function addressLabel(address: string, contracts: TransactionTrace["contracts"]): string {
  if (!address) return "N/A";
  const lower = address.toLowerCase();

  // Known contract label
  const known = KNOWN_CONTRACTS[lower];
  if (known) return `${known.name} [${known.protocol}] (${lower.slice(0, 10)}…)`;

  // Contract info from Etherscan
  const ci = contracts.find((c) => c.address === lower);
  if (ci?.name) return `${ci.name} (${lower.slice(0, 10)}…)`;

  // Shorten
  return `${lower.slice(0, 10)}…${lower.slice(-6)}`;
}

/** Build a rich context section listing which protocols are detected. */
function buildProtocolContext(trace: TransactionTrace): string {
  const allAddresses = new Set<string>();
  for (const c of trace.contracts) allAddresses.add(c.address.toLowerCase());
  for (const e of trace.events) allAddresses.add(e.address.toLowerCase());
  for (const call of trace.internalCalls) {
    allAddresses.add(call.to.toLowerCase());
    allAddresses.add(call.from.toLowerCase());
    for (const child of call.children) {
      allAddresses.add(child.to.toLowerCase());
      allAddresses.add(child.from.toLowerCase());
    }
  }

  const protocols = detectProtocols(Array.from(allAddresses));
  let ctx = "";

  if (protocols.length > 0) {
    ctx +=
      "\n\n🔍 DETECTED PROTOCOLS:\n" +
      protocols
        .map((p) => `• ${p.name} (confidence: ${p.confidence}): ${p.description}`)
        .join("\n");
  }

  // Resolve LayerZero chain IDs if present in decoded params
  const lzChainIds = new Set<number>();
  for (const call of trace.internalCalls) {
    for (const p of call.decodedInput) {
      if (/dstChainId|_dstChainId|srcChainId|chainId/i.test(p.name)) {
        const id = parseInt(p.value, 10);
        if (id > 0 && id < 100000) lzChainIds.add(id);
      }
    }
    for (const child of call.children) {
      for (const p of child.decodedInput) {
        if (/dstChainId|_dstChainId|srcChainId|chainId/i.test(p.name)) {
          const id = parseInt(p.value, 10);
          if (id > 0 && id < 100000) lzChainIds.add(id);
        }
      }
    }
  }
  // Also check events (SendToChain has dstChainId)
  for (const evt of trace.events) {
    for (const p of evt.params) {
      if (/dstChainId|_dstChainId|srcChainId/i.test(p.name)) {
        const id = parseInt(p.value, 10);
        if (id > 0 && id < 100000) lzChainIds.add(id);
      }
    }
  }

  if (lzChainIds.size > 0) {
    ctx += "\n\n🔗 LAYERZERO CHAIN ID RESOLUTION:\n";
    ctx += "IMPORTANT: LayerZero uses its OWN chain IDs (endpoint IDs), NOT standard EVM chain IDs.\n";
    for (const id of lzChainIds) {
      ctx += `• LayerZero chain ID ${id} = ${resolveLayerZeroChainId(id)}\n`;
    }
  }

  return ctx;
}

/** Build a contracts-involved section with human-readable labels. */
function buildContractsSection(trace: TransactionTrace): string {
  return trace.contracts
    .map((c) => {
      const known = KNOWN_CONTRACTS[c.address.toLowerCase()];
      const label = known
        ? `${known.name} [${known.protocol} — ${known.type}]`
        : c.name || "Unknown";
      const verified = c.verified ? "✅ Verified" : "❓ Unverified";
      return `  • ${c.address}: ${label} (${verified})`;
    })
    .join("\n");
}

/** Build events section with contract labels. */
function buildEventsSection(trace: TransactionTrace): string {
  return trace.events
    .slice(0, 30)
    .map((e) => {
      const label = addressLabel(e.address, trace.contracts);
      const params =
        e.params.length > 0
          ? e.params.map((p) => `${p.name}=${p.value}`).join(", ")
          : `topic0: ${e.topic0.slice(0, 18)}…`;
      return `  • ${e.name} @ ${label}\n    Params: ${params}`;
    })
    .join("\n");
}

/** Flatten call tree to readable text. */
function flattenCalls(
  trace: TransactionTrace,
  maxDepth = 4,
): string {
  const lines: string[] = [];

  function walk(call: TransactionTrace["internalCalls"][0], depth: number) {
    if (depth > maxDepth) return;
    const indent = "  ".repeat(depth);
    const toLabel = addressLabel(call.to, trace.contracts);
    const method = call.methodName || call.input?.slice(0, 10) || "—";
    const val =
      call.value && call.value !== "0" && call.value !== "0x0"
        ? ` (${formatWei(call.value)} ETH)`
        : "";
    const err = call.error ? ` ❌ ${call.error}` : "";
    const paramStr =
      call.decodedInput.length > 0
        ? ` [${call.decodedInput.map((p) => `${p.name}=${truncate(p.value, 40)}`).join(", ")}]`
        : "";
    lines.push(`${indent}${call.type} → ${toLabel}.${method}${paramStr}${val}${err}`);
    for (const child of call.children) walk(child, depth + 1);
  }

  for (const root of trace.internalCalls) walk(root, 0);
  return lines.join("\n") || "  (no call data available)";
}

function formatWei(value: string): string {
  try {
    // Handle both hex and decimal
    const bn = value.startsWith("0x") ? BigInt(value) : BigInt(value);
    if (bn === 0n) return "0";
    const eth = Number(bn) / 1e18;
    return eth.toFixed(6);
  } catch {
    return value;
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

// ---------- Prompt Construction ----------

function buildUserModePrompt(trace: TransactionTrace): string {
  const { basic, balanceChanges } = trace;
  const protocolCtx = buildProtocolContext(trace);

  return `You are a friendly blockchain transaction explainer. Explain this transaction to a NON-TECHNICAL user in simple, clear language. Identify the SPECIFIC action taken (e.g., "bridged tokens via LayerZero", "swapped ETH for USDC on Uniswap", "staked ETH on Lido") — do NOT use vague phrases like "sent ETH to a contract".

TRANSACTION:
  Hash: ${basic.hash}
  From: ${addressLabel(basic.from, trace.contracts)}
  To: ${basic.to ? addressLabel(basic.to, trace.contracts) : "Contract Creation"}
  Value: ${basic.value} ETH
  Status: ${basic.status}
  Gas Cost: ${basic.gasCostEth} ETH
  Block: ${basic.blockNumber}
  Method: ${basic.methodId || "Simple Transfer"}
${protocolCtx}

CONTRACTS INVOLVED:
${buildContractsSection(trace)}

DECODED EVENTS (${trace.events.length} total):
${buildEventsSection(trace)}

EXECUTION FLOW:
${flattenCalls(trace)}

BALANCE CHANGES:
${balanceChanges.map((b) => `  • ${b.tokenSymbol}: ${b.change}`).join("\n") || "  None detected"}

INSTRUCTIONS:
- Identify the HIGH-LEVEL purpose (bridge, swap, stake, mint, transfer, lending, NFT purchase, etc.)
- If a known protocol is detected, name it explicitly
- Use the ACTUAL token symbol from Transfer events and balance changes — NOT Solidity contract class names. The contract name from Etherscan is the Solidity class (e.g. "OFT", "ERC20", "VaultToken") which is NOT the token's trading symbol. Always prefer the symbol from balance changes or decoded events.
- If chain IDs are resolved in the context above, use only those resolved names — do NOT guess chain names
- Explain each meaningful step in simple terms
- Mention gas costs in human-readable way

Respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "summary": "One sentence summary identifying the specific action and protocol (e.g., 'You bridged 0.01 ETH to Arbitrum via LayerZero')",
  "whatHappened": "2-4 sentence explanation in plain English, naming the protocol and what happened",
  "steps": [
    { "stepNumber": 1, "title": "Short title", "description": "Simple explanation", "icon": "relevant emoji" }
  ],
  "balanceSummary": "What the sender gained/lost in simple terms",
  "status": "Clear success/failure message",
  "warnings": ["Any unusual observations"]
}`;
}

function buildDevModePrompt(trace: TransactionTrace): string {
  const { basic, contracts } = trace;
  const protocolCtx = buildProtocolContext(trace);

  return `You are a senior blockchain developer and security analyst. Provide a detailed technical analysis of this transaction.

TRANSACTION:
  Hash: ${basic.hash}
  From: ${basic.from}
  To: ${basic.to || "Contract Creation"}
  Value: ${basic.value} ETH (${basic.value !== "0.0" ? `${formatWei(BigInt(Math.round(parseFloat(basic.value) * 1e18)).toString())} wei` : "0 wei"})
  Status: ${basic.status}
  Gas Used: ${basic.gasUsed}
  Gas Price: ${basic.gasPrice} wei
  Gas Cost: ${basic.gasCostEth} ETH
  Block: ${basic.blockNumber}
  Nonce: ${basic.nonce}
  Method ID: ${basic.methodId}
  Input: ${basic.input.slice(0, 200)}${basic.input.length > 200 ? "…" : ""}
${protocolCtx}

CONTRACTS INVOLVED (${contracts.length}):
${buildContractsSection(trace)}

DECODED EVENTS (${trace.events.length}):
${buildEventsSection(trace)}

EXECUTION TRACE (call tree):
${flattenCalls(trace, 6)}

INSTRUCTIONS:
- Identify the exact protocol interaction and contract flow
- Use ACTUAL token symbols from events/balance changes, never use Solidity contract class names as token names (the Etherscan ContractName field is the Solidity class, not the token symbol)
- If chain IDs are resolved in the context above, use only those resolved chain names — do NOT guess or hallucinate chain names from numeric IDs
- Explain each internal call and its purpose
- Analyze gas distribution across the call tree
- Note any security concerns (approvals, delegatecalls, reentrancy patterns)
- Explain emitted events and what state changes they represent
- If this is a bridge/cross-chain tx, identify the source/destination chains using any chain ID resolution provided above

Respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "summary": "One-line technical summary identifying the protocol and action",
  "technicalOverview": "Detailed paragraph explaining the transaction flow technically, naming specific contracts and functions",
  "callFlowExplanation": "Step-by-step explanation of the call flow, referencing specific contracts and functions",
  "gasAnalysis": "Analysis of gas usage across the call tree",
  "securityNotes": ["Security observations, unusual patterns, delegatecalls, approvals"],
  "functionExplanations": [
    {
      "contract": "contract address or name",
      "functionName": "decoded function name",
      "explanation": "What this function does in context of the transaction",
      "params": "Key parameters and their significance",
      "gasUsed": "gas consumed"
    }
  ],
  "stateChanges": "Description of state changes (storage, balances, approvals, cross-chain messages)",
  "eventAnalysis": "Analysis of emitted events and what they signify"
}`;
}

// ---------- AI Call ----------

async function callAI(prompt: string, modelId: string): Promise<string> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: modelId,
    max_tokens: 16000,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are a blockchain transaction analyzer. You MUST respond exclusively with valid JSON. No markdown formatting, no code fences, no commentary — just raw JSON. Be specific: identify protocols by name, decode function purposes, and explain the actual action (bridge, swap, stake, mint, etc.).",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = response.choices[0]?.message?.content || "{}";
  return raw.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
}

// ---------- Parse AI Response ----------

function parseUserModeResponse(raw: string): UserModeInterpretation {
  // Safety: AI may return objects/arrays instead of strings for text fields
  const str = (v: unknown): string => {
    if (typeof v === "string") return v;
    if (v == null) return "";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  try {
    const parsed = JSON.parse(raw);
    return {
      summary: str(parsed.summary) || "Transaction processed",
      whatHappened: str(parsed.whatHappened) || "Unable to determine details",
      steps: Array.isArray(parsed.steps)
        ? parsed.steps.map(
            (
              s: { stepNumber?: number; title?: unknown; description?: unknown; icon?: unknown },
              i: number,
            ) => ({
              stepNumber: s.stepNumber || i + 1,
              title: str(s.title) || `Step ${i + 1}`,
              description: str(s.description),
              icon: str(s.icon) || "📋",
            }),
          )
        : [],
      balanceSummary: str(parsed.balanceSummary) || "See balance changes above",
      status: str(parsed.status) || "Completed",
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map((w: unknown) => str(w)) : [],
    };
  } catch {
    return {
      summary: "Transaction was processed on the blockchain",
      whatHappened: raw.slice(0, 500),
      steps: [],
      balanceSummary: "Unable to parse balance changes",
      status: "Completed",
      warnings: ["AI response could not be fully parsed"],
    };
  }
}

function parseDevModeResponse(raw: string): DevModeInterpretation {
  // AI models sometimes return objects instead of strings for text fields.
  // This helper safely converts any value to a rendered string.
  const asString = (v: unknown): string => {
    if (typeof v === "string") return v;
    if (v == null) return "";
    if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("\n");
    if (typeof v === "object") {
      // Try to build a readable summary from the object's values
      return Object.entries(v as Record<string, unknown>)
        .map(([k, val]) => `${k}: ${typeof val === "string" ? val : JSON.stringify(val)}`)
        .join("\n");
    }
    return String(v);
  };

  try {
    const parsed = JSON.parse(raw);
    return {
      summary: asString(parsed.summary) || "Transaction executed",
      technicalOverview: asString(parsed.technicalOverview),
      callFlowExplanation: asString(parsed.callFlowExplanation),
      gasAnalysis: asString(parsed.gasAnalysis),
      securityNotes: Array.isArray(parsed.securityNotes)
        ? parsed.securityNotes.map((n: unknown) => asString(n))
        : [],
      functionExplanations: Array.isArray(parsed.functionExplanations)
        ? parsed.functionExplanations.map(
            (f: {
              contract?: unknown;
              functionName?: unknown;
              explanation?: unknown;
              params?: unknown;
              gasUsed?: unknown;
            }) => ({
              contract: asString(f.contract),
              functionName: asString(f.functionName),
              explanation: asString(f.explanation),
              params: asString(f.params),
              gasUsed: asString(f.gasUsed),
            }),
          )
        : [],
      stateChanges: asString(parsed.stateChanges),
      eventAnalysis: asString(parsed.eventAnalysis),
    };
  } catch {
    return {
      summary: "Transaction executed on chain",
      technicalOverview: raw.slice(0, 500),
      callFlowExplanation: "",
      gasAnalysis: "",
      securityNotes: ["AI response could not be fully parsed"],
      functionExplanations: [],
      stateChanges: "",
      eventAnalysis: "",
    };
  }
}

// ---------- Main Export ----------

export async function interpretTransaction(
  trace: TransactionTrace,
  modelId: string,
): Promise<InterpretationResult> {
  const userPrompt = buildUserModePrompt(trace);
  const devPrompt = buildDevModePrompt(trace);

  console.log(`[AI] Sending to model: ${modelId}`);
  console.log(`[AI] User prompt length: ${userPrompt.length} chars`);
  console.log(`[AI] Dev prompt length: ${devPrompt.length} chars`);

  // Run both interpretations in parallel
  const [userRaw, devRaw] = await Promise.all([
    callAI(userPrompt, modelId),
    callAI(devPrompt, modelId),
  ]);

  return {
    userMode: parseUserModeResponse(userRaw),
    devMode: parseDevModeResponse(devRaw),
  };
}
