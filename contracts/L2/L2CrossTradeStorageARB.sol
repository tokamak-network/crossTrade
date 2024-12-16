// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

contract L2CrossTradeStorageARB {
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

    address public l1CrossTradeContract;
    // address public crossDomainMessenger;
    address public nativeTokenL2;
    bool public isInitialized;

    uint256 public chainIdL1;
    uint256 public saleCount;

    //saleCount => ChainData
    mapping(uint256 => RequestData) public dealData;
    


}
