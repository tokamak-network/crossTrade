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
import { KNOWN_CONTRACTS, detectProtocols, getContractLabel } from "@/lib/known-contracts";
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
  if (protocols.length === 0) return "";

  return (
    "\n\n🔍 DETECTED PROTOCOLS:\n" +
    protocols
      .map((p) => `• ${p.name} (confidence: ${p.confidence}): ${p.description}`)
      .join("\n")
  );
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
- Identify the HIGH-LEVEL purpose (bridge, swap, stake, mint, transfer, etc.)
- If a known protocol is detected, name it explicitly
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
- Explain each internal call and its purpose
- Analyze gas distribution across the call tree
- Note any security concerns (approvals, delegatecalls, reentrancy patterns)
- Explain emitted events and what state changes they represent
- If this is a bridge/cross-chain tx, identify the source/destination chains

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
  try {
    const parsed = JSON.parse(raw);
    return {
      summary: parsed.summary || "Transaction processed",
      whatHappened: parsed.whatHappened || "Unable to determine details",
      steps: Array.isArray(parsed.steps)
        ? parsed.steps.map(
            (
              s: { stepNumber?: number; title?: string; description?: string; icon?: string },
              i: number,
            ) => ({
              stepNumber: s.stepNumber || i + 1,
              title: s.title || `Step ${i + 1}`,
              description: s.description || "",
              icon: s.icon || "📋",
            }),
          )
        : [],
      balanceSummary: parsed.balanceSummary || "See balance changes above",
      status: parsed.status || "Completed",
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
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
  try {
    const parsed = JSON.parse(raw);
    return {
      summary: parsed.summary || "Transaction executed",
      technicalOverview: parsed.technicalOverview || "",
      callFlowExplanation: parsed.callFlowExplanation || "",
      gasAnalysis: parsed.gasAnalysis || "",
      securityNotes: Array.isArray(parsed.securityNotes) ? parsed.securityNotes : [],
      functionExplanations: Array.isArray(parsed.functionExplanations)
        ? parsed.functionExplanations.map(
            (f: {
              contract?: string;
              functionName?: string;
              explanation?: string;
              params?: string;
              gasUsed?: string;
            }) => ({
              contract: f.contract || "",
              functionName: f.functionName || "",
              explanation: f.explanation || "",
              params: f.params || "",
              gasUsed: f.gasUsed || "",
            }),
          )
        : [],
      stateChanges: parsed.stateChanges || "",
      eventAnalysis: parsed.eventAnalysis || "",
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
