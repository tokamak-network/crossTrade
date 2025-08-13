// Chain configurations
export const CHAIN_CONFIG = {
  // Optimism Sepolia
  11155420: {
    name: 'Optimism Sepolia',
    displayName: 'Optimism',
    contracts: {
      L2_CROSS_TRADE: "0xc0c33138355e061511f8954c114edc7c9e7bfac4",
    },
    tokens: {
      ETH: '0x0000000000000000000000000000000000000000',
      USDC: '0x5fd84259d66cd46123540766be93dfe6d43130d7',
      USDT: '0xebca682b6c15d539284432edc5b960771f0009e8',
      TON: '', // Add address when available
    }
  },
  // Ethereum Sepolia
  11155111: {
    name: 'Ethereum Sepolia',
    displayName: 'Ethereum',
    contracts: {
      L1_CROSS_TRADE: '', // Add L1 contract address
    },
    tokens: {
      ETH: '0x0000000000000000000000000000000000000000',
      USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Add Ethereum Sepolia USDC address
      USDT: '', // Add Ethereum Sepolia USDT address
      TON: '', // Add address when available
    }
  },
  // Thanos Sepolia
  111551119090: {
    name: 'Thanos Sepolia',
    displayName: 'Thanos',
    contracts: {
      L2_CROSS_TRADE: '', // Add Thanos Sepolia contract address
    },
    tokens: {
      ETH: '0x0000000000000000000000000000000000000000',
      USDC: '0x4200000000000000000000000000000000000778', // Add Thanos Sepolia USDC address
      USDT: '', // Add Thanos Sepolia USDT address
      TON: '', // Add TON address when available
    }
  },
  // GeorgeChain (Custom)
  123444: {
    name: 'GeorgeChain',
    displayName: 'GeorgeChain',
    contracts: {
      L2_CROSS_TRADE: '', // Add GeorgeChain contract address
    },
    tokens: {
      ETH: '0x0000000000000000000000000000000000000000',
      USDC: '', // Add GeorgeChain USDC address
      USDT: '', // Add GeorgeChain USDT address
      TON: '', // Add TON address when available
    }
  },
  // MonicaChain (Custom)
  1235555: {
    name: 'MonicaChain',
    displayName: 'MonicaChain',
    contracts: {
      L2_CROSS_TRADE: '', // Add MonicaChain contract address
    },
    tokens: {
      ETH: '0x0000000000000000000000000000000000000000',
      USDC: '', // Add MonicaChain USDC address
      USDT: '', // Add MonicaChain USDT address
      TON: '', // Add TON address when available
    }
  }
} as const;

// Legacy contract addresses (for backward compatibility)
export const CONTRACTS = {
  L2_CROSS_TRADE: "0xc0c33138355e061511f8954c114edc7c9e7bfac4", 
} as const;

// Chain name to ID mapping
export const CHAIN_IDS = {
  'Optimism': 11155420,
  'Ethereum': 11155111,
  'GeorgeChain': 123444,
  'MonicaChain': 1235555,
  'Thanos Sepolia': 111551119090,
} as const;

// Helper functions
export const getChainConfig = (chainId: number) => {
  return CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG];
};

export const getTokenAddress = (chainId: number, tokenSymbol: string) => {
  const config = getChainConfig(chainId);
  return config?.tokens[tokenSymbol as keyof typeof config.tokens] || '';
};

export const getContractAddress = (chainId: number, contractName: string) => {
  const config = getChainConfig(chainId);
  return config?.contracts[contractName as keyof typeof config.contracts] || '';
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

// ABI for the RequestCT event only (as array)
export const REQUEST_CT_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "_l1token", type: "address" },
      { indexed: false, internalType: "address", name: "_l2SourceToken", type: "address" },
      { indexed: false, internalType: "address", name: "_l2DestinationToken", type: "address" },
      { indexed: false, internalType: "address", name: "_requester", type: "address" },
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
      { "internalType": "uint256", "name": "_totalAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_initialctAmount", "type": "uint256" },
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