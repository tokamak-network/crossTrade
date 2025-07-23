// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Proxy } from "../proxy/Proxy.sol";
import { L2toL2CrossTradeStorageL1 } from "./L2toL2CrossTradeStorageL1.sol";

contract L2toL2CrossTradeProxyL1 is Proxy, L2toL2CrossTradeStorageL1 {

    /// @notice Initialize the proxy
    /// @param _optimismChainId optimism chainId
    /// @param _usdcAddress usdc address on L1
    function initialize(
        uint256 _optimismChainId,
        address _usdcAddress,
        address _usdtAddress
    ) 
        external
        onlyOwner
    {
        optimismChainId = _optimismChainId;
        usdcAddress = _usdcAddress;
        usdtAddress = _usdtAddress;
    }

    /// @notice Store addresses for chainId
    /// @param _crossDomainMessenger crossDomainMessenger address for chainId
    /// @param _l2CrossTrade L2CrossTradeProxy address for chainId
    /// @param _l2NativeTokenAddressOnL1 nativeToken address for chainId
    /// @param _l1StandardBridge standard bridge address for chainId
    /// @param _l1USDCBridge usdc bridge address for chainId
    /// @param _l2ChainId store chainId
    function setChainInfo(
        address _crossDomainMessenger,
        address _l2CrossTrade,
        address _l2NativeTokenAddressOnL1,
        address _l1StandardBridge,
        address _l1USDCBridge,
        uint256 _l2ChainId
    )
        external
        onlyOwner
    {
        chainData[_l2ChainId] = ChainIdData({
            crossDomainMessenger: _crossDomainMessenger,
            l2CrossTradeContract: _l2CrossTrade,
            l2NativeTokenAddressOnL1: _l2NativeTokenAddressOnL1,
            l1StandardBridge: _l1StandardBridge,
            l1USDCBridge: _l1USDCBridge
        });
    }
}

