// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import { Proxy } from "../proxy/Proxy.sol";
import { L2toL2CrossTradeStorageV2TRH } from "./L2toL2CrossTradeStorageV2TRH.sol";

contract L2toL2CrossTradeProxyV2TRH is Proxy, L2toL2CrossTradeStorageV2TRH {

    /// @notice L2CrossTrade initial settings
    /// @param _crossDomainMessenger crossDomainMessenger address
    /// @param _legacyERC20ETH legacyERC20ETH address 
    function initialize(
        address _crossDomainMessenger,
        address _legacyERC20ETH
    ) 
        external
        onlyOwner
    {
        crossDomainMessenger = _crossDomainMessenger;
        legacyERC20ETH = _legacyERC20ETH;
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