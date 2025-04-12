// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import { Proxy } from "../proxy/Proxy.sol";
import { L2toL2CrossTradeStorage } from "./L2toL2CrossTradeStorage.sol";

contract L2toL2CrossTradeProxy is Proxy, L2toL2CrossTradeStorage {

    /// @notice L2CrossTrade initial settings
    /// @param _crossDomainMessenger crossDomainMessenger address
    /// @param _nativeToken nativeToken address 
    function initialize(
        address _crossDomainMessenger,
        address _nativeToken
    ) 
        external
        onlyOwner
    {
        crossDomainMessenger = _crossDomainMessenger;
        nativeToken = _nativeToken;
    }

    /// @notice Store addresses for chainId
    /// @param _l1CrossTrade L1CrossTradeProxy address for chainId
    /// @param _l1NativeToken l1NativeToken address for chainId
    /// @param _chainId store chainId
    function setChainInfo(
        address _l1CrossTrade,
        address _l1NativeToken,
        uint256 _chainId
    )
        external
        onlyOwner
    {
        chainData[_chainId] = ChainIdData({
            l1CrossTradeContract: _l1CrossTrade,
            l1NativeToken: _l1NativeToken
        });
    }
}
