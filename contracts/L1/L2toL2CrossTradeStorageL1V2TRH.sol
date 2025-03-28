// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

contract L2toL2CrossTradeStorageL1V2TRH {

    uint8 internal constant CLAIM_CT = 1;
    uint8 internal constant CANCEL_CT = 2;

    /// @notice This is a variable that points to the cross-domain messenger contract in an L2
    ///         It also contains information such as the address where each CrossTradeContract is deployed.
    struct L2ChainData {
        address crossDomainMessenger;
        address l2CrossTradeContract;
        address legacyERC20ETH;
    }
    
    /// @notice This is the address list of L1StandardBridge per L2 chain id 
    mapping(uint256 => address) public l1StandardBridge;
    
    /// @notice This is a HashValue that has completed bridge from L1, and the value of cancellation is also true.
    mapping(bytes32 => bool) public successCT;
    
    /// @notice This is a value that identifies the requester's address for a specific HashValue.
    mapping(bytes32 => address) public cancelL1;
    
    /// @notice This is a value that identifies the address of the provider for a specific HashValue.
    mapping(bytes32 => address) public provideAccount;
    
    /// @notice This is the value you get when editing
    mapping(bytes32 => uint256) public editCtAmount;
    
    /// @notice This is chainData information that stores information on how to bridge to L2.
    mapping(uint256 => L2ChainData) public chainData;

    /// @notice Tracks if a token requires special handling for approvals (like USDT)
    mapping(address => bool) public nonStandardERC20s;
}
