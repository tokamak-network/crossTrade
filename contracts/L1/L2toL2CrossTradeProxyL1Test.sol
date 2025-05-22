// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import { Proxy } from "../proxy/Proxy.sol";
import { L2toL2CrossTradeStorageL1 } from "./L2toL2CrossTradeStorageL1.sol";

contract L2toL2CrossTradeProxyL1 is Proxy, L2toL2CrossTradeStorageL1 {


    // Type should be on params in request
    // titan ETH => thanos ETH 
    //  titan ETH 0x0000000000000000000000000000000000000000
    //  sepolia ETH 0x0000000000000000000000000000000000000000
    //  thaons ETH  0x4200000000000000000000000000000000000486
    //
    //
    //
    // setchainInfo(Titan 55007)
    //setchainInfo(Thaon 11555....)
    //
    //
    // registerProvide()
    //

    function setChainInfoNew(
        address _crossDomainMessenger,
        address _l2CrossTrade,
        address _nativeToken,
        uint256 _l2ChainId
    ) external {    

    }


    function initialize(
        address _nativeToken,
        uint256 _optimismChainId
    ) 
        external
        onlyOwner
    {
        nativeToken = _nativeToken;
        optimismChainId = _optimismChainId;
    }

    /// @notice Store addresses for chainId
    /// @param _crossDomainMessenger crossDomainMessenger address for chainId
    /// @param _l2CrossTrade L2CrossTradeProxy address for chainId
    /// @param _l2NativeTokenAddressOnL1 nativeToken address for chainId
    /// @param _l2ChainId store chainId
    function setChainInfo(
        address _crossDomainMessenger,
        address _l2CrossTrade,
        address _l2NativeTokenAddressOnL1,
        uint256 _l2ChainId
    )
        external
        onlyOwner
    {
        chainData[_l2ChainId] = ChainIdData({
            crossDomainMessenger: _crossDomainMessenger,
            l2CrossTradeContract: _l2CrossTrade,
            l2NativeTokenAddressOnL1: _l2NativeTokenAddressOnL1
        });
    }

    function setL1StandardBridge(
        uint256 _l2ChainId,
        address _l1StandardBridgeAddress
    )
        external
        onlyOwner
    {
        l1StandardBridge[_l2ChainId] = _l1StandardBridgeAddress;
    }

// will set everything with msg.sender instead of onlyOwner to avoid centralization. 
// anyone can set a bridge - setChainInfo + setL1StandardBridge and they will be differentiated by msg.sender
// so we know on our frontend what chainInfo and L1standardBrdige to use. (based on the msg.sender values)
// need to adapt provideCT and every other functions based on the msg.sender values. 
// WE HAVE EVERYTING IN PROVIDECT =>  but we use registerProvideCT (or something) to double check the values
// so we use our frontend with registerProvideCT in orderd to double check the setChainInfo/l1standardBridge
// can be avoided by using normal proviceCT ( but no checks are guaranteed )

}

