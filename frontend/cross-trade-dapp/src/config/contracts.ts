// Chain configurations loaded from environment variables

// Type definitions for chain configuration
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
const loadChainConfig = (): ChainConfigs => {
  const chainConfigEnv = process.env.NEXT_PUBLIC_CHAIN_CONFIG;
  console.log("in contracts.ts config:", chainConfigEnv);
  if (!chainConfigEnv) {
    console.warn('NEXT_PUBLIC_CHAIN_CONFIG not found in environment variables, using fallback configuration');
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
    console.error('Error parsing NEXT_PUBLIC_CHAIN_CONFIG:', error);
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

// Load chain configuration from environment variables
const chainConfigs = loadChainConfig();

// Export the chain configuration with proper typing
export const CHAIN_CONFIG = chainConfigs;

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

// Legacy static chain IDs (for backward compatibility)
export const CHAIN_IDS = {
  'Optimism': 11155420,
  'Ethereum': 11155111,
  'GeorgeChain': 123444,
  'MonicaChain': 1235555,
  'Thanos Sepolia': 111551119090,
} as const;

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

// ABI for the requestRegisteredToken function
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

