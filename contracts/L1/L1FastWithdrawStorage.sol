// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

contract L1FastWithdrawStorage {
    address public crossDomainMessenger;
    address public l2fastWithdrawContract;
    address public LEGACY_ERC20_ETH;
    address public LEGACY_l1token;
    address public portal;

    address public OTHER_MESSENGER = 0x4200000000000000000000000000000000000007;
}
