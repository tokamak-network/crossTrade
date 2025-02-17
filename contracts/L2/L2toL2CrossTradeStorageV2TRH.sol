// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

contract L2toL2CrossTradeStorageV2TRH {
    struct RequestData {
        address l1token;
        address l2SourceToken;
        address l2DestinationToken;
        address requester;
        address provider;
        uint256 totalAmount;
        uint256 ctAmount;
        uint256 l1ChainId;
        uint256 l2DestinationChainId; 
        bytes32 hashValue;
    }

    struct ChainIdData {
        address l1CrossTradeContract;
        address l1TON;
    }

    address public crossDomainMessenger;
    address public legacyERC20ETH;

    uint256 public saleCount;

    mapping(uint256 => RequestData) public dealData;
    mapping(address => mapping(uint256 => mapping(bytes32 => bool))) public registerCheck;

    // should we have an array with ids for a msg.sender ??
    // mapping(address => array[bytes32]) with all the values an address has ? or a mapping


    //chainId => ChainData
    mapping(uint256 => ChainIdData) public chainData;

}