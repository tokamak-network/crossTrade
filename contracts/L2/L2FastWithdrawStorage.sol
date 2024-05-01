// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

contract L2FastWithdrawStorage {
    struct RequestData {
        address l1token;
        address l2token;
        address requester;
        address provider;
        uint256 totalAmount;
        uint256 fwAmount;
    }

    address public crossDomainMessenger;
    address public l1fastWithdrawContract;
    address public LEGACY_ERC20_ETH;
    address public LEGACY_l1token;

    address public msgSender;


    uint256 public salecount;

    mapping(uint256 => RequestData) public dealData;
    // mapping(address => address) public enteringToken;
    // mapping(address => mapping(address => bool)) public checkToken;
}
