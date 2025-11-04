// Chain configurations loaded from environment variables

// Type definitions for chain configuration
import {env} from 'next-runtime-env'
export interface ChainConfig {
  name: string;
  displayName: string;
  contracts: {
    L2_CROSS_TRADE?: string;
    L1_CROSS_TRADE?: string;
  };
  tokens: {
    ETH: string;
    USDC: string;
    USDT: string;
    TON: string;
  };
}

export interface ChainConfigs {
  [chainId: string]: ChainConfig;
}

// Function to load and parse chain configuration from environment variables
const loadChainConfig = (configType: 'L2_L2' | 'L2_L1' | 'FALLBACK' = 'FALLBACK'): ChainConfigs => {
  let chainConfigEnv: string | undefined;
  
  if (configType === 'L2_L2') {
    chainConfigEnv = env('NEXT_PUBLIC_CHAIN_CONFIG_L2_L2');
    console.log("in contracts.ts L2_L2 config:", chainConfigEnv);
  } else if (configType === 'L2_L1') {
    chainConfigEnv = env('NEXT_PUBLIC_CHAIN_CONFIG_L2_L1');
    console.log("in contracts.ts L2_L1 config:", chainConfigEnv);
  } else {
    // Fallback: try L2_L2 first, then L2_L1, then legacy NEXT_PUBLIC_CHAIN_CONFIG
    chainConfigEnv = env('NEXT_PUBLIC_CHAIN_CONFIG_L2_L2') || 
                     env('NEXT_PUBLIC_CHAIN_CONFIG_L2_L1') || 
                     env('NEXT_PUBLIC_CHAIN_CONFIG');
    console.log("in contracts.ts config:", chainConfigEnv);
  }
  
  if (!chainConfigEnv) {
    console.warn(`Chain configuration not found for ${configType}, using fallback configuration`);
    // Fallback configuration
    return {
      "11155420": {
        name: 'Optimism Sepolia',
        displayName: 'Optimism',
        contracts: {
          L2_CROSS_TRADE: "0xCc316D79B3310c31C5112BbACd737dB254b007aB",
        },
        tokens: {
          ETH: '0x0000000000000000000000000000000000000000',
          USDC: '0x5fd84259d66cd46123540766be93dfe6d43130d7',
          USDT: '0xebca682b6c15d539284432edc5b960771f0009e8',
          TON: '',
        }
      },
      "11155111": {
        name: 'Ethereum Sepolia',
        displayName: 'Ethereum',
        contracts: {
          L1_CROSS_TRADE: '0xDa2CbF69352cB46d9816dF934402b421d93b6BC2',
        },
        tokens: {
          ETH: '0x0000000000000000000000000000000000000000',
          USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
          USDT: '',
          TON: '',
        }
      }
    };
  }

  try {
    return JSON.parse(chainConfigEnv) as ChainConfigs;
  } catch (error) {
    console.error(`Error parsing chain configuration for ${configType}:`, error);
    console.warn('Using fallback configuration');
    // Return fallback configuration in case of parsing error
    return {
      "11155420": {
        name: 'Optimism Sepolia',
        displayName: 'Optimism',
        contracts: {
          L2_CROSS_TRADE: "0xCc316D79B3310c31C5112BbACd737dB254b007aB",
        },
        tokens: {
          ETH: '0x0000000000000000000000000000000000000000',
          USDC: '0x5fd84259d66cd46123540766be93dfe6d43130d7',
          USDT: '0xebca682b6c15d539284432edc5b960771f0009e8',
          TON: '',
        }
      }
    };
  }
};

// Load chain configurations for both L2_L2 and L2_L1
const chainConfigsL2L2 = loadChainConfig('L2_L2');
const chainConfigsL2L1 = loadChainConfig('L2_L1');
const chainConfigs = loadChainConfig('FALLBACK');

// Export the chain configurations with proper typing
export const CHAIN_CONFIG = chainConfigs;
export const CHAIN_CONFIG_L2_L2 = chainConfigsL2L2;
export const CHAIN_CONFIG_L2_L1 = chainConfigsL2L1;

// Legacy contract addresses (for backward compatibility)
export const CONTRACTS = {
  L2_CROSS_TRADE: "0xCc316D79B3310c31C5112BbACd737dB254b007aB", 
} as const;

// Dynamic chain name to ID mapping based on loaded configuration
export const getChainIds = (): Record<string, number> => {
  const chainIds: Record<string, number> = {};
  Object.entries(CHAIN_CONFIG).forEach(([chainId, config]) => {
    chainIds[config.displayName] = parseInt(chainId);
  });
  return chainIds;
};

// Dynamic chain IDs based on environment configuration
export const CHAIN_IDS = (() => {
  const chainIds: Record<string, number> = {};
  Object.entries(CHAIN_CONFIG).forEach(([chainId, config]) => {
    chainIds[config.displayName] = parseInt(chainId);
  });
  return chainIds;
})();

// Helper functions
export const getChainConfig = (chainId: number): ChainConfig | undefined => {
  return CHAIN_CONFIG[chainId.toString()];
};

export const getTokenAddress = (chainId: number, tokenSymbol: string): string => {
  const config = getChainConfig(chainId);
  return config?.tokens[tokenSymbol as keyof typeof config.tokens] || '';
};

export const getContractAddress = (chainId: number, contractName: string): string => {
  const config = getChainConfig(chainId);
  return config?.contracts[contractName as keyof typeof config.contracts] || '';
};

// Get all available chain IDs
export const getAllChainIds = (): number[] => {
  return Object.keys(CHAIN_CONFIG).map(chainId => parseInt(chainId));
};

// Get all chains with their configurations
export const getAllChains = (): Array<{ chainId: number; config: ChainConfig }> => {
  return Object.entries(CHAIN_CONFIG).map(([chainId, config]) => ({
    chainId: parseInt(chainId),
    config
  }));
};

// Check if a chain is supported
export const isChainSupported = (chainId: number): boolean => {
  return chainId.toString() in CHAIN_CONFIG;
};

// ========== L2_L2 Specific Functions ==========

export const getChainsFor_L2_L2 = (): Array<{ chainId: number; config: ChainConfig }> => {
  return Object.entries(CHAIN_CONFIG_L2_L2).map(([chainId, config]) => ({
    chainId: parseInt(chainId),
    config
  }));
};

export const getChainConfigFor_L2_L2 = (chainId: number): ChainConfig | undefined => {
  return CHAIN_CONFIG_L2_L2[chainId.toString()];
};

export const getTokenAddressFor_L2_L2 = (chainId: number, tokenSymbol: string): string => {
  const config = getChainConfigFor_L2_L2(chainId);
  return config?.tokens[tokenSymbol as keyof typeof config.tokens] || '';
};

export const getContractAddressFor_L2_L2 = (chainId: number, contractName: string): string => {
  const config = getChainConfigFor_L2_L2(chainId);
  return config?.contracts[contractName as keyof typeof config.contracts] || '';
};

export const getAllChainIdsFor_L2_L2 = (): number[] => {
  return Object.keys(CHAIN_CONFIG_L2_L2).map(chainId => parseInt(chainId));
};

export const isChainSupportedFor_L2_L2 = (chainId: number): boolean => {
  return chainId.toString() in CHAIN_CONFIG_L2_L2;
};

export const getAvailableTokensFor_L2_L2 = (chainName: string) => {
  const chainIds = (() => {
    const ids: Record<string, number> = {};
    Object.entries(CHAIN_CONFIG_L2_L2).forEach(([chainId, config]) => {
      ids[config.displayName] = parseInt(chainId);
    });
    return ids;
  })();
  
  const chainId = chainIds[chainName as keyof typeof chainIds];
  if (!chainId) return [];
  
  const config = getChainConfigFor_L2_L2(chainId);
  if (!config) return [];
  
  return Object.entries(config.tokens)
    .filter(([symbol, address]) => address && address !== '')
    .map(([symbol]) => symbol);
};

// ========== L2_L1 Specific Functions ==========

export const getChainsFor_L2_L1 = (): Array<{ chainId: number; config: ChainConfig }> => {
  return Object.entries(CHAIN_CONFIG_L2_L1).map(([chainId, config]) => ({
    chainId: parseInt(chainId),
    config
  }));
};

export const getChainConfigFor_L2_L1 = (chainId: number): ChainConfig | undefined => {
  return CHAIN_CONFIG_L2_L1[chainId.toString()];
};

export const getTokenAddressFor_L2_L1 = (chainId: number, tokenSymbol: string): string => {
  const config = getChainConfigFor_L2_L1(chainId);
  return config?.tokens[tokenSymbol as keyof typeof config.tokens] || '';
};

export const getContractAddressFor_L2_L1 = (chainId: number, contractName: string): string => {
  const config = getChainConfigFor_L2_L1(chainId);
  return config?.contracts[contractName as keyof typeof config.contracts] || '';
};

export const getAllChainIdsFor_L2_L1 = (): number[] => {
  return Object.keys(CHAIN_CONFIG_L2_L1).map(chainId => parseInt(chainId));
};

export const isChainSupportedFor_L2_L1 = (chainId: number): boolean => {
  return chainId.toString() in CHAIN_CONFIG_L2_L1;
};

export const getAvailableTokensFor_L2_L1 = (chainName: string) => {
  const chainIds = (() => {
    const ids: Record<string, number> = {};
    Object.entries(CHAIN_CONFIG_L2_L1).forEach(([chainId, config]) => {
      ids[config.displayName] = parseInt(chainId);
    });
    return ids;
  })();
  
  const chainId = chainIds[chainName as keyof typeof chainIds];
  if (!chainId) return [];
  
  const config = getChainConfigFor_L2_L1(chainId);
  if (!config) return [];
  
  return Object.entries(config.tokens)
    .filter(([symbol, address]) => address && address !== '')
    .map(([symbol]) => symbol);
};

// Helper function to get token decimals
export const getTokenDecimals = (tokenSymbol: string) => {
  switch (tokenSymbol) {
    case 'USDC':
    case 'USDT':
      return 6 // USDC and USDT use 6 decimals
    case 'ETH':
    case 'TON':
    default:
      return 18 // ETH and most tokens use 18 decimals
  }
};

// Get available tokens for a chain (only tokens with non-empty addresses)
export const getAvailableTokens = (chainName: string) => {
  const chainId = CHAIN_IDS[chainName as keyof typeof CHAIN_IDS]
  if (!chainId) return []
  
  const config = getChainConfig(chainId)
  if (!config) return []
  
  return Object.entries(config.tokens)
    .filter(([symbol, address]) => address && address !== '')
    .map(([symbol]) => symbol)
};

// ========== L2_L2 ABIs (L2toL2CrossTradeL2.sol) ==========

// ABI for the requestRegisteredToken function on L2
export const L2_CROSS_TRADE_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_l1token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_l2SourceToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_l2DestinationToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_receiver",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_totalAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_ctAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_l1ChainId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_l2DestinationChainId",
        "type": "uint256"
      }
    ],
    "name": "requestRegisteredToken",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const; 

// ABI for the requestNonRegisteredToken function (same signature as requestRegisteredToken)
export const L2_CROSS_TRADE_NON_REGISTERED_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_l1token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_l2SourceToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_l2DestinationToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_receiver",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_totalAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_ctAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_l1ChainId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_l2DestinationChainId",
        "type": "uint256"
      }
    ],
    "name": "requestNonRegisteredToken",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

// ABI for the RequestCT event only (as array)
export const REQUEST_CT_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "_l1token", type: "address" },
      { indexed: false, internalType: "address", name: "_l2SourceToken", type: "address" },
      { indexed: false, internalType: "address", name: "_l2DestinationToken", type: "address" },
      { indexed: false, internalType: "address", name: "_requester", type: "address" },
      { indexed: false, internalType: "address", name: "_receiver", type: "address" },
      { indexed: false, internalType: "uint256", name: "_totalAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "_ctAmount", type: "uint256" },
      { indexed: true, internalType: "uint256", name: "_saleCount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "_l1ChainId", type: "uint256" },
      { indexed: true, internalType: "uint256", name: "_l2SourceChainId", type: "uint256" },
      { indexed: true, internalType: "uint256", name: "_l2DestinationChainId", type: "uint256" },
      { indexed: false, internalType: "bytes32", name: "_hashValue", type: "bytes32" }
    ],
    name: "RequestCT",
    type: "event" as const
  }
]; 

// ABI for the provideCT function on the L1 contract
export const PROVIDE_CT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_l1token", "type": "address" },
      { "internalType": "address", "name": "_l2SourceToken", "type": "address" },
      { "internalType": "address", "name": "_l2DestinationToken", "type": "address" },
      { "internalType": "address", "name": "_requestor", "type": "address" },
      { "internalType": "address", "name": "_receiver", "type": "address" },
      { "internalType": "uint256", "name": "_totalAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_initialctAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_editedctAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_saleCount", "type": "uint256" },
      { "internalType": "uint256", "name": "_l2SourceChainId", "type": "uint256" },
      { "internalType": "uint256", "name": "_l2DestinationChainId", "type": "uint256" },
      { "internalType": "uint32", "name": "_minGasLimit", "type": "uint32" },
      { "internalType": "bytes32", "name": "_hash", "type": "bytes32" }
    ],
    "name": "provideCT",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

// ABI for the editFee function on the L1 contract
export const EDIT_FEE_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_l1token", "type": "address" },
      { "internalType": "address", "name": "_l2SourceToken", "type": "address" },
      { "internalType": "address", "name": "_l2DestinationToken", "type": "address" },
      { "internalType": "address", "name": "_receiver", "type": "address" },
      { "internalType": "uint256", "name": "_totalAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_initialctAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_editedctAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_saleCount", "type": "uint256" },
      { "internalType": "uint256", "name": "_l2SourceChainId", "type": "uint256" },
      { "internalType": "uint256", "name": "_l2DestinationChainId", "type": "uint256" },
      { "internalType": "bytes32", "name": "_hash", "type": "bytes32" }
    ],
    "name": "editFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// ABI for the cancel function on the L1 contract
export const CANCEL_CT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_l1token", "type": "address" },
      { "internalType": "address", "name": "_l2SourceToken", "type": "address" },
      { "internalType": "address", "name": "_l2DestinationToken", "type": "address" },
      { "internalType": "address", "name": "_receiver", "type": "address" },
      { "internalType": "uint256", "name": "_totalAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_initialctAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_saleCount", "type": "uint256" },
      { "internalType": "uint256", "name": "_l2SourceChainId", "type": "uint256" },
      { "internalType": "uint256", "name": "_l2DestinationChainId", "type": "uint256" },
      { "internalType": "uint32", "name": "_minGasLimit", "type": "uint32" },
      { "internalType": "bytes32", "name": "_hash", "type": "bytes32" }
    ],
    "name": "cancel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// ========== L2_L1 ABIs (L2CrossTrade.sol & L1CrossTrade.sol - OLD implementation) ==========

// ABI for the requestRegisteredToken function on L2 (L2 to L1 mode - OLD contract with 6 params)
export const L2_L1_REQUEST_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_l1token", "type": "address" },
      { "internalType": "address", "name": "_l2token", "type": "address" },
      { "internalType": "address", "name": "_receiver", "type": "address" },
      { "internalType": "uint256", "name": "_totalAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_ctAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_l1chainId", "type": "uint256" }
    ],
    "name": "requestRegisteredToken",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

// ABI for the provideCT function on L1 (L2 to L1 mode - OLD contract with _l2token and _l2chainId)
export const L2_L1_PROVIDE_CT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_l1token", "type": "address" },
      { "internalType": "address", "name": "_l2token", "type": "address" },
      { "internalType": "address", "name": "_requestor", "type": "address" },
      { "internalType": "address", "name": "_receiver", "type": "address" },
      { "internalType": "uint256", "name": "_totalAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_initialctAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_editedctAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_salecount", "type": "uint256" },
      { "internalType": "uint256", "name": "_l2chainId", "type": "uint256" },
      { "internalType": "uint32", "name": "_minGasLimit", "type": "uint32" },
      { "internalType": "bytes32", "name": "_hash", "type": "bytes32" }
    ],
    "name": "provideCT",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

// ABI for the cancel function on L1 (L2 to L1 mode - OLD contract with _l2token and _l2chainId)
export const L2_L1_CANCEL_CT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_l1token", "type": "address" },
      { "internalType": "address", "name": "_l2token", "type": "address" },
      { "internalType": "address", "name": "_receiver", "type": "address" },
      { "internalType": "uint256", "name": "_totalAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_initialctAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_salecount", "type": "uint256" },
      { "internalType": "uint256", "name": "_l2chainId", "type": "uint256" },
      { "internalType": "uint32", "name": "_minGasLimit", "type": "uint32" },
      { "internalType": "bytes32", "name": "_hash", "type": "bytes32" }
    ],
    "name": "cancel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// ABI for the editFee function on L1 (L2 to L1 mode - OLD contract with _l2token and _l2chainId)
export const L2_L1_EDIT_FEE_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_l1token", "type": "address" },
      { "internalType": "address", "name": "_l2token", "type": "address" },
      { "internalType": "address", "name": "_receiver", "type": "address" },
      { "internalType": "uint256", "name": "_totalAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_initialctAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_editedctAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_salecount", "type": "uint256" },
      { "internalType": "uint256", "name": "_l2chainId", "type": "uint256" },
      { "internalType": "bytes32", "name": "_hash", "type": "bytes32" }
    ],
    "name": "editFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// ABI for RequestCT event on L2 (L2_L1 mode - OLD contract with _l2token and _l2chainId)
export const L2_L1_REQUEST_CT_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "_l1token", type: "address" },
      { indexed: false, internalType: "address", name: "_l2token", type: "address" },
      { indexed: false, internalType: "address", name: "_requester", type: "address" },
      { indexed: false, internalType: "address", name: "_receiver", type: "address" },
      { indexed: false, internalType: "uint256", name: "_totalAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "_ctAmount", type: "uint256" },
      { indexed: true, internalType: "uint256", name: "_saleCount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "_l2chainId", type: "uint256" },
      { indexed: false, internalType: "bytes32", name: "_hashValue", type: "bytes32" }
    ],
    name: "RequestCT",
    type: "event" as const
  }
];

// ABI for ProvideCT event on L1 (L2_L1 mode - OLD contract with _l2token and _l2chainId)
export const L2_L1_PROVIDE_CT_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "_l1token", type: "address" },
      { indexed: false, internalType: "address", name: "_l2token", type: "address" },
      { indexed: false, internalType: "address", name: "_requester", type: "address" },
      { indexed: false, internalType: "address", name: "_receiver", type: "address" },
      { indexed: false, internalType: "address", name: "_provider", type: "address" },
      { indexed: false, internalType: "uint256", name: "_totalAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "_ctAmount", type: "uint256" },
      { indexed: true, internalType: "uint256", name: "_saleCount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "_l2chainId", type: "uint256" },
      { indexed: false, internalType: "bytes32", name: "_hash", type: "bytes32" }
    ],
    name: "ProvideCT",
    type: "event" as const
  }
];

// ABI for EditCT event on L1 (L2_L1 mode - OLD contract with _l2token and _l2chainId)
export const L2_L1_EDIT_CT_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "_l1token", type: "address" },
      { indexed: false, internalType: "address", name: "_l2token", type: "address" },
      { indexed: false, internalType: "address", name: "_requester", type: "address" },
      { indexed: false, internalType: "address", name: "_receiver", type: "address" },
      { indexed: false, internalType: "uint256", name: "_totalAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "_ctAmount", type: "uint256" },
      { indexed: true, internalType: "uint256", name: "_saleCount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "_l2chainId", type: "uint256" },
      { indexed: false, internalType: "bytes32", name: "_hash", type: "bytes32" }
    ],
    name: "EditCT",
    type: "event" as const
  }
];  

