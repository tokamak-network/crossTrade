// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract L2toL2CrossTradeStorage {
    struct RequestData {
        address l1token;
        address l2SourceToken;
        address l2DestinationToken;
        address requester;
        address receiver;
        address provider;
        uint256 totalAmount;
        uint256 ctAmount;
        uint256 l1ChainId;
        uint256 l2DestinationChainId; 
        bytes32 hashValue;
    }

    address public crossDomainMessenger;
    address public NATIVE_TOKEN = address(0);

    // chainIdDestination => saleCount
    mapping(uint256 => uint256) public saleCountChainId;

    // chainIdDestination => saleCount => RequestData
    mapping(uint256 => mapping(uint256 => RequestData)) public dealData;
    mapping(bytes32 => bool) public registerCheck;

    //chainId => ChainData
    mapping(uint256 => address) public l1CrossTradeContract;

}
