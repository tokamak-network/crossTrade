// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

import { Proxy } from "../proxy/Proxy.sol";
import { L1FastWithdrawStorage } from "./L1FastWithdrawStorage.sol";

contract L1FastWithdrawProxy is Proxy, L1FastWithdrawStorage {

    function initialize(
        address _crossDomainMessenger,
        address _l2fastWithdraw,
        address _legacyERC20,
        address _l1legacyERC20
    ) 
        external
        onlyOwner
    {
        crossDomainMessenger = _crossDomainMessenger;
        l2fastWithdrawContract = _l2fastWithdraw;
        legacyERC20ETH = _legacyERC20;
        nativeL1token = _l1legacyERC20;
    }
}
