// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Proxy } from "../proxy/Proxy.sol";
import { L1CrossTradeStorage } from "./L1CrossTradeStorage.sol";

contract L1CrossTradeProxy is Proxy, L1CrossTradeStorage {

    /// @notice Store addresses for chainId
    /// @param _crossDomainMessenger crossDomainMessenger address for chainId
    /// @param _l2CrossTrade L2CrossTradeProxy address for chainId
    /// @param _l2chainId store chainId
    function setChainInfo(
        address _crossDomainMessenger,
        address _l2CrossTrade,
        uint256 _l2chainId
    )
        external
        onlyOwner
    {
        chainData[_l2chainId] = ChainIdData({
            crossDomainMessenger: _crossDomainMessenger,
            l2CrossTradeContract: _l2CrossTrade
        });
    }
}

