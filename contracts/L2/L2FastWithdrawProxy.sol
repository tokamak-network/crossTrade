// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

import { Proxy } from "../proxy/Proxy.sol";
import { L2FastWithdrawStorage } from "./L2FastWithdrawStorage.sol";

contract L2FastWithdrawProxy is Proxy, L2FastWithdrawStorage {

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
        LEGACY_ERC20_ETH = _legacyERC20;
        enteringToken[_legacyERC20] = _l1legacyERC20;
        checkToken[_l1legacyERC20][_legacyERC20] = true;
    }
}
