// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import { Proxy } from "../proxy/Proxy.sol";
import { L1CrossTradeStorage } from "./L1CrossTradeStorage.sol";

contract L1CrossTradeProxy is Proxy, L1CrossTradeStorage {

    /// @notice Store addresses for chainId
    /// @param _crossDomainMessenger crossDomainMessenger address for chainId
    /// @param _l2CrossTrade L2CrossTradeProxy address for chainId
    /// @param _legacyERC20 legacyERC20 address for chainId
    /// @param _l1legacyERC20 l1legacyERC20 address for chainId
    /// @param _l2chainId store chainId
    function chainInfo(
        address _crossDomainMessenger,
        address _l2CrossTrade,
        address _legacyERC20,
        address _l1legacyERC20,
        uint256 _l2chainId
    )
        external
        onlyOwner
    {
        chainData[_l2chainId] = ChainIdData({
            crossDomainMessenger: _crossDomainMessenger,
            l2CrossTradeContract: _l2CrossTrade,
            legacyERC20ETH: _legacyERC20,
            nativeL1token: _l1legacyERC20
        });
    }
}

