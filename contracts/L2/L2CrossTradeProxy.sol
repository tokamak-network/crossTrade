// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

import { Proxy } from "../proxy/Proxy.sol";
import { L2CrossTradeStorage } from "./L2CrossTradeStorage.sol";

contract L2CrossTradeProxy is Proxy, L2CrossTradeStorage {

    function initialize(
        address _crossDomainMessenger,
        address _l1fastWithdraw,
        address _legacyERC20,
        address _l1legacyERC20
    ) 
        external
        onlyOwner
    {
        crossDomainMessenger = _crossDomainMessenger;
        l1fastWithdrawContract = _l1fastWithdraw;
        legacyERC20ETH = _legacyERC20;
        nativeL1token = _l1legacyERC20;
    }
}