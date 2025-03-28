// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

/// @title L2toL2CrossTradeStorageV2TRH
/// @notice Storage contract for the L2toL2CrossTradeL2V2TRH contract
contract L2toL2CrossTradeStorageV2TRH {
    /// @notice Stores all information for a cross-chain token request
    struct RequestData {
        address l1token;             // L1 token address
        address l2SourceToken;       // L2 source token address
        address l2DestinationToken;  // L2 destination token address
        address requester;           // Address that initiated the request
        address provider;            // Address that provided the tokens
        uint256 totalAmount;         // Total amount provided to L2
        uint256 ctAmount;            // Amount to be received from L1
        uint256 l1ChainId;           // ChainId of L1 token
        uint256 l2DestinationChainId; // Destination L2 chain ID
        bytes32 hashValue;           // Hash of the request
    }

    /// @notice Stores chain-specific data 
    struct ChainIdData {
        address l1CrossTradeContract; // L1 CrossTrade contract address for this chain
        address l1TON;                // L1 token address
    }

    /// @notice Cross-domain messenger contract address
    address public crossDomainMessenger;
    
    /// @notice Legacy ETH wrapper token address
    address public legacyERC20ETH;

    /// @notice Counter for generating unique sale IDs
    uint256 public saleCount;

    /// @notice Maps sale IDs to their request data
    mapping(uint256 => RequestData) public dealData;
    
    /// @notice Tracks registered token configurations by user, chain, and token ID
    /// @dev user => destination chain ID => token config hash => registered status
    mapping(address => mapping(uint256 => mapping(bytes32 => bool))) public registerCheck;

    /// @notice Stores chain-specific data for each supported L1 chain
    /// @dev chainId => ChainData
    mapping(uint256 => ChainIdData) public chainData;
}