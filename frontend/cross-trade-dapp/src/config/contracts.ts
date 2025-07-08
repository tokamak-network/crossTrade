// Contract addresses (update these with your deployed contract addresses)
export const CONTRACTS = {
  L2_CROSS_TRADE: "0xc0c33138355e061511f8954c114edc7c9e7bfac4", 
} as const;

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