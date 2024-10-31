// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

contract L1FastWithdrawStorage {
    address public crossDomainMessenger;
    address public l2fastWithdrawContract;
    address public legacyERC20ETH;
    address public nativeL1token;

    uint256 public chainID;
}
