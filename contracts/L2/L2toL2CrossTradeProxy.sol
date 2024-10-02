// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import { Proxy } from "../proxy/Proxy.sol";
import { L2toL2CrossTradeStorage } from "./L2toL2CrossTradeStorage.sol";

contract L2toL2CrossTradeProxy is Proxy, L2toL2CrossTradeStorage {

    /// @notice L2CrossTrade initial settings
    /// @param _crossDomainMessenger crossDomainMessenger address
    /// @param _legacyERC20 legacyERC20 address 
    function initialize(
        address _crossDomainMessenger,
        address _legacyERC20
    ) 
        external
        onlyOwner
    {
        crossDomainMessenger = _crossDomainMessenger;
        legacyERC20ETH = _legacyERC20;
    }

    /// @notice Store addresses for chainId
    /// @param _l1CrossTrade L1CrossTradeProxy address for chainId
    /// @param _l1legacyERC20 l1legacyERC20 address for chainId
    /// @param _chainId store chainId
    function setChainInfo(
        address _l1CrossTrade,
        address _l1legacyERC20,
        uint256 _chainId
    )
        external
        onlyOwner
    {
        chainData[_chainId] = ChainIdData({
            l1CrossTradeContract: _l1CrossTrade,
            l1TON: _l1legacyERC20
        });
    }
}
