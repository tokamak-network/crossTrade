// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

contract L2FastWithdrawStorage {
    struct RequestData {
        address l2token;
        address l1token;
        address seller;
        address buyer;
        uint256 sellAmount;
        uint256 minAmount;
        uint256 buyAmount;
    }

    address public crossDomainMessenger;
    address public l1fastWithdrawContract;
    address public LEGACY_ERC20_ETH;
    address public LEGACY_l1token;


    uint256 public salecount;

    mapping(uint256 => RequestData) public dealData;
    // mapping(address => address) public enteringToken;
    // mapping(address => mapping(address => bool)) public checkToken;
}
