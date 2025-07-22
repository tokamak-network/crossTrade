// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import { Proxy } from "../proxy/Proxy.sol";
import { L2toL2CrossTradeStorage } from "./L2toL2CrossTradeStorage.sol";

contract L2toL2CrossTradeProxy is Proxy, L2toL2CrossTradeStorage {

    /// @notice L2CrossTrade initial settings
    /// @param _crossDomainMessenger crossDomainMessenger address
    function initialize(
        address _crossDomainMessenger
    ) 
        external
        onlyOwner
    {
        crossDomainMessenger = _crossDomainMessenger;
    }

    /// @notice Store addresses for chainId
    /// @param _l1CrossTrade L1CrossTradeProxy address for chainId
    /// @param _chainId store chainId
    function setChainInfo(
        address _l1CrossTrade,
        uint256 _chainId
    )
        external
        onlyOwner
    {
        l1CrossTradeContract[_chainId] = _l1CrossTrade;
    }
}
