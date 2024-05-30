// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import { Proxy } from "../proxy/Proxy.sol";
import { L2CrossTradeStorage } from "./L2CrossTradeStorage.sol";

contract L2CrossTradeProxy is Proxy, L2CrossTradeStorage {

    function initialize(
        address _crossDomainMessenger,
        address _l1crossTrade,
        address _legacyERC20,
        address _l1legacyERC20
    ) 
        external
        onlyOwner
    {
        crossDomainMessenger = _crossDomainMessenger;
        l1CrossTradeContract = _l1crossTrade;
        legacyERC20ETH = _legacyERC20;
        nativeL1token = _l1legacyERC20;
    }
}
