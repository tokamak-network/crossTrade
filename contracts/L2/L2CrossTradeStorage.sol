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


    address public crossDomainMessenger;
    address public NATIVE_TOKEN = address(0);

    uint256 public saleCount;

    //saleCount => ChainData
    mapping(uint256 => RequestData) public dealData;
    mapping(uint256 => mapping(address => mapping(address => bool))) public registerCheck;
    
    //chainId => l1CrossTradeContract
    mapping(uint256 => address) public chainData;

}
