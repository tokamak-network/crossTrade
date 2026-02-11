// ============================================================================
// Transaction Interpreter — Constants & Configuration
// ============================================================================

import { Chain, AIModel } from "./types";

export const SUPPORTED_CHAINS: Chain[] = [
  {
    id: "ethereum",
    name: "Ethereum",
    chainId: 1,
    rpcUrl: "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io",
    nativeCurrency: "ETH",
    icon: "⟠",
  },
  {
    id: "polygon",
    name: "Polygon",
    chainId: 137,
    rpcUrl: "https://polygon.llamarpc.com",
    explorerUrl: "https://polygonscan.com",
    nativeCurrency: "MATIC",
    icon: "⬡",
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    nativeCurrency: "ETH",
    icon: "🔵",
  },
  {
    id: "optimism",
    name: "Optimism",
    chainId: 10,
    rpcUrl: "https://mainnet.optimism.io",
    explorerUrl: "https://optimistic.etherscan.io",
    nativeCurrency: "ETH",
    icon: "🔴",
  },
  {
    id: "base",
    name: "Base",
    chainId: 8453,
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    nativeCurrency: "ETH",
    icon: "🔷",
  },
  {
    id: "bsc",
    name: "BNB Smart Chain",
    chainId: 56,
    rpcUrl: "https://bsc-dataseed.binance.org",
    explorerUrl: "https://bscscan.com",
    nativeCurrency: "BNB",
    icon: "🟡",
  },
];

export const AI_MODELS: AIModel[] = [
  // --- FREE (Qwen — hosted on Tokamak infrastructure) ---
  {
    id: "qwen3-coder-flash",
    name: "Qwen3 Coder Flash",
    provider: "Qwen",
    tier: "free",
    description: "Fast, free, great for code — hosted locally",
  },
  {
    id: "qwen3-235b-thinking",
    name: "Qwen3 235B Thinking",
    provider: "Qwen",
    tier: "free",
    description: "Large reasoning model with thinking traces, free",
  },
  {
    id: "qwen3-235b",
    name: "Qwen3 235B",
    provider: "Qwen",
    tier: "free",
    description: "Large model, fast, free",
  },
  {
    id: "qwen3-80b-next",
    name: "Qwen3 80B Next",
    provider: "Qwen",
    tier: "free",
    description: "Mid-size, good balance, free",
  },
  // --- STANDARD ---
  {
    id: "deepseek-reasoner",
    name: "DeepSeek Reasoner",
    provider: "DeepSeek",
    tier: "standard",
    description: "Best for step-by-step reasoning",
  },
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    provider: "DeepSeek",
    tier: "standard",
    description: "Fast general chat",
  },
  {
    id: "deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: "DeepSeek",
    tier: "standard",
    description: "Latest general model",
  },
  {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    tier: "standard",
    description: "Balanced speed & quality",
  },
  {
    id: "anthropic-max-claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    tier: "standard",
    description: "Fast, lightweight",
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "Google",
    tier: "standard",
    description: "Fast Google model",
  },
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "Google",
    tier: "standard",
    description: "Google flagship model",
  },
  {
    id: "grok-4-1-fast-reasoning",
    name: "Grok 4.1 Fast",
    provider: "xAI",
    tier: "standard",
    description: "Fast reasoning from xAI",
  },
  {
    id: "perplexity/sonar",
    name: "Perplexity Sonar",
    provider: "Perplexity",
    tier: "standard",
    description: "Search-augmented generation",
  },
  // --- PREMIUM ---
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    provider: "OpenAI",
    tier: "premium",
    description: "Base GPT-5.2",
  },
  {
    id: "gpt-5.2-pro",
    name: "GPT-5.2 Pro",
    provider: "OpenAI",
    tier: "premium",
    description: "Top-tier general model",
  },
  {
    id: "gpt-5.2-codex",
    name: "GPT-5.2 Codex",
    provider: "OpenAI",
    tier: "premium",
    description: "Specialized for code analysis",
  },
  {
    id: "anthropic-max-claude-opus-4-6",
    name: "Claude Opus 4.6",
    provider: "Anthropic",
    tier: "premium",
    description: "Latest Opus — best quality",
  },
];

// Common function signatures for decoding
export const KNOWN_SIGNATURES: Record<string, string> = {
  "0xa9059cbb": "transfer(address,uint256)",
  "0x23b872dd": "transferFrom(address,address,uint256)",
  "0x095ea7b3": "approve(address,uint256)",
  "0x70a08231": "balanceOf(address)",
  "0x18160ddd": "totalSupply()",
  "0x313ce567": "decimals()",
  "0x06fdde03": "name()",
  "0x95d89b41": "symbol()",
  "0x7ff36ab5": "swapExactETHForTokens(uint256,address[],address,uint256)",
  "0x38ed1739": "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
  "0x8803dbee": "swapTokensForExactTokens(uint256,uint256,address[],address,uint256)",
  "0xfb3bdb41": "swapETHForExactTokens(uint256,address[],address,uint256)",
  "0x18cbafe5": "swapExactTokensForETH(uint256,uint256,address[],address,uint256)",
  "0x4a25d94a": "swapTokensForExactETH(uint256,uint256,address[],address,uint256)",
  "0xe8e33700": "addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)",
  "0xf305d719": "addLiquidityETH(address,uint256,uint256,uint256,address,uint256)",
  "0xbaa2abde": "removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)",
  "0x02751cec": "removeLiquidityETH(address,uint256,uint256,uint256,address,uint256)",
  "0xd0e30db0": "deposit()",
  "0x2e1a7d4d": "withdraw(uint256)",
  "0xb6b55f25": "deposit(uint256)",
  "0x3ccfd60b": "withdraw()",
  "0xa694fc3a": "stake(uint256)",
  "0x2e17de78": "unstake(uint256)",
  "0x4e71d92d": "claim()",
  "0x3d18b912": "getReward()",
  "0x42842e0e": "safeTransferFrom(address,address,uint256)",
  "0xb88d4fde": "safeTransferFrom(address,address,uint256,bytes)",
  "0x40c10f19": "mint(address,uint256)",
  "0x9dc29fac": "burn(address,uint256)",
  "0x1249c58b": "mint()",
  "0x42966c68": "burn(uint256)",
  // ── Bridge / Cross-chain ──
  "0xae30f6ee": "swapAndBridge(uint256,uint256,uint16,address,address,address,bytes)",
  "0x51905636": "sendFrom(address,uint16,bytes,uint256,(address,address,bytes))",
  "0xc1461d57": "sendToChain(uint16,bytes,uint256)",
  "0x40d9a49e": "send(uint16,bytes,uint256,address,address,bytes)",
  "0x6e553f65": "deposit(uint256,address)",
  "0xc858f5f9": "bridge(uint256,uint32,uint256,bytes)",
  "0x2d2da806": "depositTo(address)",
  // ── Permit2 / Universal Router ──
  "0x3593564c": "execute(bytes,bytes[],uint256)",
  "0x24856bc3": "execute(bytes,bytes[])",
};

// Etherscan V2 API: single API key works for all chains
export const ETHERSCAN_API_KEY: string = process.env.ETHERSCAN_API_KEY || "";
export const ETHERSCAN_V2_BASE = "https://api.etherscan.io/v2/api";
