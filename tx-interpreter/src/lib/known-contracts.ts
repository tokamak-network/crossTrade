// ============================================================================
// Well-Known Contracts, Event Signatures & Protocol Detection
// Used to enrich transaction data without relying solely on block explorer APIs
// ============================================================================

// ---------- Well-Known Contract Addresses (Ethereum Mainnet) ----------

export interface KnownContract {
  name: string;
  protocol: string;
  type: "token" | "dex" | "dex-aggregator" | "bridge" | "lending" | "staking" | "nft-marketplace" | "naming" | "multisig" | "oracle" | "defi" | "infrastructure" | "other";
}

export const KNOWN_CONTRACTS: Record<string, KnownContract> = {
  // ── Wrapped Native ──
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": { name: "WETH", protocol: "Wrapped Ether", type: "token" },

  // ── Major Stablecoins ──
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { name: "USDC", protocol: "Circle", type: "token" },
  "0xdac17f958d2ee523a2206206994597c13d831ec7": { name: "USDT", protocol: "Tether", type: "token" },
  "0x6b175474e89094c44da98b954eedeac495271d0f": { name: "DAI", protocol: "MakerDAO", type: "token" },
  "0x4fabb145d64652a948d72533023f6e7a623c7c53": { name: "BUSD", protocol: "Paxos", type: "token" },
  "0x853d955acef822db058eb8505911ed77f175b99e": { name: "FRAX", protocol: "Frax Finance", type: "token" },

  // ── Major Tokens ──
  "0x514910771af9ca656af840dff83e8264ecf986ca": { name: "LINK", protocol: "Chainlink", type: "token" },
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": { name: "UNI", protocol: "Uniswap", type: "token" },
  "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9": { name: "AAVE", protocol: "Aave", type: "token" },
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": { name: "WBTC", protocol: "Wrapped Bitcoin", type: "token" },
  "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce": { name: "SHIB", protocol: "Shiba Inu", type: "token" },
  "0x6982508145454ce325ddbe47a25d4ec3d2311933": { name: "PEPE", protocol: "Pepe", type: "token" },

  // ── LayerZero ──
  "0x66a71dcef29a0ffbdbe3c6a460a3b5bc225cd675": { name: "LayerZero Endpoint V1", protocol: "LayerZero", type: "bridge" },
  "0x1a44076050125825900e736c501f859c50fe728c": { name: "LayerZero Endpoint V2", protocol: "LayerZero", type: "bridge" },
  "0x902f09715b6303d4173037652fa7dbbfbc7b8588": { name: "LayerZero RelayerV2", protocol: "LayerZero", type: "bridge" },
  "0x5a54fe5234e811466d5366846283323c954310b2": { name: "LayerZero UltraLightNodeV2", protocol: "LayerZero", type: "bridge" },
  "0x4d73adb72bc3dd368966edd0f0b2148401a178e2": { name: "LayerZero UltraLightNodeV2", protocol: "LayerZero", type: "bridge" },
  "0x38de71124f7a447a01d67945a51edce9ff491251": { name: "LayerZero Treasury", protocol: "LayerZero", type: "bridge" },

  // ── Stargate (built on LayerZero) ──
  "0x8731d54e9d02c286767d56ac03e8037c07e01e98": { name: "Stargate Router", protocol: "Stargate", type: "bridge" },
  "0x296f55f8fb28e498b858d0bcda06d955b2cb3f97": { name: "STG Token", protocol: "Stargate", type: "token" },
  "0x101816545f6f2c2284ac97aa68f558aa4238e2c1": { name: "Stargate Pool Native", protocol: "Stargate", type: "bridge" },

  // ── Uniswap ──
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": { name: "Uniswap V2 Router", protocol: "Uniswap", type: "dex" },
  "0xe592427a0aece92de3edee1f18e0157c05861564": { name: "Uniswap V3 SwapRouter", protocol: "Uniswap", type: "dex" },
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": { name: "Uniswap V3 SwapRouter02", protocol: "Uniswap", type: "dex" },
  "0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b": { name: "Uniswap Universal Router", protocol: "Uniswap", type: "dex" },
  "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad": { name: "Uniswap Universal Router V2", protocol: "Uniswap", type: "dex" },
  "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f": { name: "Uniswap V2 Factory", protocol: "Uniswap", type: "dex" },
  "0x1f98431c8ad98523631ae4a59f267346ea31f984": { name: "Uniswap V3 Factory", protocol: "Uniswap", type: "dex" },
  "0x000000000022d473030f116ddee9f6b43ac78ba3": { name: "Uniswap Permit2", protocol: "Uniswap", type: "dex" },

  // ── SushiSwap ──
  "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f": { name: "SushiSwap Router", protocol: "SushiSwap", type: "dex" },

  // ── Curve ──
  "0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7": { name: "Curve 3pool", protocol: "Curve", type: "dex" },
  "0xd51a44d3fae010294c616388b506acda1bfaae46": { name: "Curve Tricrypto2", protocol: "Curve", type: "dex" },

  // ── 1inch ──
  "0x1111111254eeb25477b68fb85ed929f73a960582": { name: "1inch Router V5", protocol: "1inch", type: "dex-aggregator" },
  "0x111111125421ca6dc452d289314280a0f8842a65": { name: "1inch Router V6", protocol: "1inch", type: "dex-aggregator" },

  // ── 0x / Matcha ──
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff": { name: "0x Exchange Proxy", protocol: "0x Protocol", type: "dex-aggregator" },

  // ── Aave ──
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2": { name: "Aave V3 Pool", protocol: "Aave", type: "lending" },
  "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9": { name: "Aave V2 Lending Pool", protocol: "Aave", type: "lending" },

  // ── Compound ──
  "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b": { name: "Compound Comptroller", protocol: "Compound", type: "lending" },
  "0xc3d688b66703497daa19211eedff47f25384cdc3": { name: "Compound V3 cUSDCv3", protocol: "Compound", type: "lending" },

  // ── Lido ──
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": { name: "Lido stETH", protocol: "Lido", type: "staking" },
  "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0": { name: "Lido wstETH", protocol: "Lido", type: "staking" },

  // ── Rocket Pool ──
  "0xae78736cd615f374d3085123a210448e74fc6393": { name: "rETH", protocol: "Rocket Pool", type: "staking" },

  // ── OpenSea / NFT ──
  "0x00000000000000adc04c56bf30ac9d3c0aaf14dc": { name: "Seaport 1.5", protocol: "OpenSea", type: "nft-marketplace" },
  "0x00000000006c3852cbef3e08e8df289169ede581": { name: "Seaport 1.1", protocol: "OpenSea", type: "nft-marketplace" },

  // ── ENS ──
  "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85": { name: "ENS Base Registrar", protocol: "ENS", type: "naming" },
  "0x283af0b28c62c092c9727f1ee09c02ca627eb7f5": { name: "ENS ETH Registrar Controller", protocol: "ENS", type: "naming" },

  // ── Gnosis Safe ──
  "0xd9db270c1b5e3bd161e8c8503c55ceabee709552": { name: "Gnosis Safe Singleton", protocol: "Gnosis Safe", type: "multisig" },
  "0xa6b71e26c5e0845f74c812102ca7114b6a896ab2": { name: "Gnosis Safe Proxy Factory", protocol: "Gnosis Safe", type: "multisig" },

  // ── Across Protocol ──
  "0x5c7bcd6e7de5423a257d81b442095a1a6ced35c5": { name: "Across SpokePool", protocol: "Across", type: "bridge" },

  // ── Hop Protocol ──
  "0xb8901acb165ed027e32754e0ffe830802919727f": { name: "Hop ETH Bridge", protocol: "Hop", type: "bridge" },

  // ── Arbitrum ──
  "0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f": { name: "Arbitrum Delayed Inbox", protocol: "Arbitrum", type: "bridge" },
  "0x8315177ab297ba92a06054ce80a67ed4dbd7ed3a": { name: "Arbitrum Bridge", protocol: "Arbitrum", type: "bridge" },

  // ── Optimism ──
  "0x99c9fc46f92e8a1c0dec1b1747d010903e884be1": { name: "Optimism Gateway", protocol: "Optimism", type: "bridge" },

  // ── Wormhole ──
  "0x98f3c9e6e3face36baad05fe09d375ef1464288b": { name: "Wormhole Core Bridge", protocol: "Wormhole", type: "bridge" },
  "0x3ee18b2214aff97000d974cf647e7c347e8fa585": { name: "Wormhole Token Bridge", protocol: "Wormhole", type: "bridge" },

  // ── MakerDAO ──
  "0x9759a6ac90977b93b58547b4a71c78317f391a28": { name: "MakerDAO DSProxy Factory", protocol: "MakerDAO", type: "defi" },
  "0x5ef30b9986345249bc32d8928b7ee64de9435e39": { name: "MakerDAO CDP Manager", protocol: "MakerDAO", type: "defi" },

  // ── EigenLayer ──
  "0x858646372cc42e1a627fce94aa7a7033e7cf075a": { name: "EigenLayer StrategyManager", protocol: "EigenLayer", type: "staking" },

  // ── Multicall ──
  "0xca11bde05977b3631167028862be2a173976ca11": { name: "Multicall3", protocol: "Multicall", type: "infrastructure" },
};

// ---------- Well-Known Event Signatures (ABI fragments for decoding) ----------
// These allow decoding common events even when the contract ABI isn't available

export const KNOWN_EVENT_ABIS: Record<string, string> = {
  // ERC-20 Transfer(address indexed from, address indexed to, uint256 value)
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef":
    "event Transfer(address indexed from, address indexed to, uint256 value)",

  // ERC-20 Approval(address indexed owner, address indexed spender, uint256 value)
  "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925":
    "event Approval(address indexed owner, address indexed spender, uint256 value)",

  // WETH Deposit(address indexed dst, uint256 wad)
  "0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c":
    "event Deposit(address indexed dst, uint256 wad)",

  // WETH Withdrawal(address indexed src, uint256 wad)
  "0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65":
    "event Withdrawal(address indexed src, uint256 wad)",

  // UniswapV2 Swap
  "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822":
    "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)",

  // UniswapV3 Swap
  "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67":
    "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",

  // UniswapV2 Sync
  "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1":
    "event Sync(uint112 reserve0, uint112 reserve1)",

  // UniswapV2 Mint (LP add liquidity)
  "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f":
    "event Mint(address indexed sender, uint256 amount0, uint256 amount1)",

  // UniswapV2 Burn (LP remove liquidity)
  "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496":
    "event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to)",

  // ERC-721 Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
  // Same topic0 as ERC-20 Transfer but with tokenId indexed - ethers.js handles this

  // OwnershipTransferred
  "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0":
    "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
};

// ---------- Protocol Detection ----------

export interface DetectedProtocol {
  name: string;
  description: string;
  confidence: "high" | "medium";
}

const PROTOCOL_SIGNATURES: {
  name: string;
  description: string;
  addresses: string[];
}[] = [
  {
    name: "LayerZero Bridge",
    description:
      "Cross-chain messaging/bridging protocol. This transaction sends a message or bridges tokens to another blockchain via LayerZero's omnichain interoperability protocol.",
    addresses: [
      "0x66a71dcef29a0ffbdbe3c6a460a3b5bc225cd675",
      "0x1a44076050125825900e736c501f859c50fe728c",
      "0x902f09715b6303d4173037652fa7dbbfbc7b8588",
      "0x5a54fe5234e811466d5366846283323c954310b2",
      "0x4d73adb72bc3dd368966edd0f0b2148401a178e2",
    ],
  },
  {
    name: "Stargate Bridge",
    description:
      "Cross-chain liquidity transport protocol built on LayerZero. Bridges stablecoins and native assets across chains.",
    addresses: [
      "0x8731d54e9d02c286767d56ac03e8037c07e01e98",
      "0x101816545f6f2c2284ac97aa68f558aa4238e2c1",
    ],
  },
  {
    name: "Uniswap DEX",
    description: "Decentralized exchange. Swaps tokens using automated market maker (AMM) liquidity pools.",
    addresses: [
      "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
      "0xe592427a0aece92de3edee1f18e0157c05861564",
      "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45",
      "0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b",
      "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad",
    ],
  },
  {
    name: "Aave Lending",
    description: "Decentralized lending/borrowing protocol. Users supply, borrow, repay, or liquidate positions.",
    addresses: [
      "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2",
      "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",
    ],
  },
  {
    name: "Lido Liquid Staking",
    description: "Liquid staking for ETH. Users stake ETH and receive stETH/wstETH as a liquid receipt.",
    addresses: [
      "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
      "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
    ],
  },
  {
    name: "1inch DEX Aggregator",
    description: "DEX aggregator that finds optimal swap routes across multiple liquidity sources.",
    addresses: [
      "0x1111111254eeb25477b68fb85ed929f73a960582",
      "0x111111125421ca6dc452d289314280a0f8842a65",
    ],
  },
  {
    name: "OpenSea NFT Marketplace",
    description: "NFT marketplace. Buying, selling, or listing NFTs.",
    addresses: [
      "0x00000000000000adc04c56bf30ac9d3c0aaf14dc",
      "0x00000000006c3852cbef3e08e8df289169ede581",
    ],
  },
  {
    name: "ENS (Ethereum Name Service)",
    description: "Domain name system for Ethereum. Registering, renewing, or transferring .eth names.",
    addresses: [
      "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85",
      "0x283af0b28c62c092c9727f1ee09c02ca627eb7f5",
    ],
  },
  {
    name: "Wormhole Bridge",
    description: "Cross-chain bridge and messaging protocol connecting multiple blockchains.",
    addresses: [
      "0x98f3c9e6e3face36baad05fe09d375ef1464288b",
      "0x3ee18b2214aff97000d974cf647e7c347e8fa585",
    ],
  },
  {
    name: "Arbitrum Bridge",
    description: "Official bridge for depositing/withdrawing tokens to/from Arbitrum L2.",
    addresses: [
      "0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f",
      "0x8315177ab297ba92a06054ce80a67ed4dbd7ed3a",
    ],
  },
  {
    name: "Optimism Bridge",
    description: "Official bridge for depositing/withdrawing tokens to/from Optimism L2.",
    addresses: ["0x99c9fc46f92e8a1c0dec1b1747d010903e884be1"],
  },
];

/**
 * Detect which protocols are involved based on the transaction's contract addresses.
 */
export function detectProtocols(addresses: string[]): DetectedProtocol[] {
  const lowerAddresses = new Set(addresses.map((a) => a.toLowerCase()));
  const detected: DetectedProtocol[] = [];

  for (const proto of PROTOCOL_SIGNATURES) {
    const matched = proto.addresses.some((a) => lowerAddresses.has(a));
    if (matched) {
      detected.push({
        name: proto.name,
        description: proto.description,
        confidence: "high",
      });
    }
  }

  return detected;
}

/**
 * Get a human-readable label for a contract address (or null if unknown).
 */
export function getContractLabel(address: string): string | null {
  const known = KNOWN_CONTRACTS[address.toLowerCase()];
  if (!known) return null;
  return `${known.name} (${known.protocol})`;
}
