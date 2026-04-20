// Contract addresses (Ethereum mainnet)
export const TON_ADDRESS = "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5";
export const WTON_ADDRESS = "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2";
export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// WTON contract deployed at block 10,559,883
export const WTON_DEPLOY_BLOCK = 10_559_883;

// ERC20 ABI (minimal for our needs)
export const ERC20_ABI = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

// API Configuration
export const RPC_URL = process.env.RPC_URL || "";
export const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
export const ETHERSCAN_V2_BASE = "https://api.etherscan.io/v2/api";

// Burn badge tiers
export const BADGES = {
  LEGENDARY: { threshold: 1_000_000, icon: "🔥", label: "Legendary Burner" },
  EPIC: { threshold: 100_000, icon: "💎", label: "Epic Burner" },
  RARE: { threshold: 10_000, icon: "⭐", label: "Rare Burner" },
  COMMON: { threshold: 1_000, icon: "🌟", label: "Burner" },
  NOVICE: { threshold: 0, icon: "🔸", label: "Novice" },
};

// Navigation links
export const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/burns", label: "Burns" },
  { href: "/leaderboard", label: "Leaderboard" },
];
