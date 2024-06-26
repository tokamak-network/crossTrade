// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

contract L2CrossTradeStorage {
    struct RequestData {
        address l1token;
        address l2token;
        address requester;
        address provider;
        uint256 totalAmount;
        uint256 ctAmount;
        uint256 chainId;
        bytes32 hashValue;
    }

    struct ChainIdData {
        address l1CrossTradeContract;
        address nativeL1token;
    }

    address public crossDomainMessenger;
    address public legacyERC20ETH;
    // address public nativeL1token;

    uint256 public saleCount;

    //saleCount => ChainData
    mapping(uint256 => RequestData) public dealData;
    mapping(uint256 => mapping(address => address)) public enteringToken;
    
    //chainId => ChainData
    mapping(uint256 => ChainIdData) public chainData;

}
