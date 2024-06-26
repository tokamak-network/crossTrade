// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import { Proxy } from "../proxy/Proxy.sol";
import { L2CrossTradeStorage } from "./L2CrossTradeStorage.sol";

contract L2CrossTradeProxy is Proxy, L2CrossTradeStorage {

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
        // chainCross[_chainId] = _l1CrossTrade;
        chainData[_chainId] = ChainIdData({
            l1CrossTradeContract: _l1CrossTrade,
            nativeL1token: _l1legacyERC20
        });
    }
}
