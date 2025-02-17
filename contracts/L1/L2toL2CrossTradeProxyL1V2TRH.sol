// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import { Proxy } from "../proxy/Proxy.sol";
import { L2toL2CrossTradeStorageL1V2TRH } from "./L2toL2CrossTradeStorageL1V2TRH.sol";

contract L2toL2CrossTradeProxyL1V2TRH is Proxy, L2toL2CrossTradeStorageL1V2TRH{                

    
    // Type should be on params in request
    // titan ETH => thanos ETH 
    //  titan ETH 0x0000000000000000000000000000000000000000
    //  sepolia ETH 0x0000000000000000000000000000000000000000
    //  thaons ETH  0x4200000000000000000000000000000000000486
    //
    // setchainInfo(Titan 55007)
    // 
    //
    //
    //setchainInfo(Thaon 11555....)
    //
    //
    // registerProvide()
    //
    //
    //
    //
    //
    //
    //
    //


    function setChainInfoNew(
        address _crossDomainMessenger,
        address _l2CrossTrade,
        address _legacyERC20ETH,
        address _l1legacyERC20,
        uint256 _l2chainId
    ) external {

    }

    /// @notice Store addresses for chainId for a specific SetterAccount
    /// @param _crossDomainMessenger crossDomainMessenger address for chainId
    /// @param _l2CrossTrade L2CrossTradeProxy address for chainId
    /// @param _legacyERC20ETH legacyERC20ETH address for chainId
    /// @param _l1legacyERC20 l1legacyERC20 address for chainId
    /// @param _l2chainId store chainId
    function setChainInfo(
        address _crossDomainMessenger,
        address _l2CrossTrade,
        address _legacyERC20ETH,
        address _l1legacyERC20,
        uint256 _l2chainId
    )
        external
    {
        chainData[msg.sender][_l2chainId] = ChainIdData({
            crossDomainMessenger: _crossDomainMessenger,
            l2CrossTradeContract: _l2CrossTrade,
            legacyERC20ETH: _legacyERC20ETH,
            l1TON: _l1legacyERC20
        });
    }

    function setL1StandardBridge(
        uint256 chainId,
        address l1StandardBridgeAddress
    )
        external
    {
        l1StandardBridge[msg.sender][chainId] = l1StandardBridgeAddress;
    }

// will set everything with msg.sender instead of onlyOwner to avoid centralization. 
// anyone can set a bridge - setChainInfo + setL1StandardBridge and they will be differentiated by msg.sender
// so we know on our frontend what chainInfo and L1standardBrdige to use. (based on the msg.sender values)
// need to adapt provideCT and every other functions based on the msg.sender values. 
// WE HAVE EVERYTING IN PROVIDECT =>  but we use registerProvideCT (or something) to double check the values
// so we use our frontend with registerProvideCT in orderd to double check the setChainInfo/l1standardBridge
// can be avoided by using normal proviceCT ( but no checks are guaranteed )
//registerProvide will take as params the values gave by the frontend (and msg sender) and will double check
// if the setChainInfo and l1StandardBridge are set acordingly.

}

