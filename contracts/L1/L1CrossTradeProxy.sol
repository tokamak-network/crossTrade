// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import { Proxy } from "../proxy/Proxy.sol";
import { L1CrossTradeStorage } from "./L1CrossTradeStorage.sol";

contract L1CrossTradeProxy is Proxy, L1CrossTradeStorage {

    function initialize(
        address _crossDomainMessenger
    ) 
        external
        onlyOwner
    {
        crossDomainMessenger = _crossDomainMessenger;
    }

    function chainInfo(
        address _l2fastWithdraw,
        address _legacyERC20,
        address _l1legacyERC20,
        uint256 _l2chainId,
        uint256 _editTime
    )
        external
        onlyOwner
    {
        chainData[_l2chainId] = ChainIdData({
            l2fastWithdrawContract: _l2fastWithdraw,
            legacyERC20ETH: _legacyERC20,
            nativeL1token: _l1legacyERC20,
            editTime: _editTime
        });
    }
}

