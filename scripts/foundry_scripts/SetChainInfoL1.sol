// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/L1/L2toL2CrossTradeProxyL1.sol";

contract SetChainInfoL1 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Setting chain info for L1...");
        
        address proxyAddress = 0x1C5fc73342B0597827D2812Bb0955188903dA31f;
        
        L2toL2CrossTradeProxyL1 proxy = L2toL2CrossTradeProxyL1(proxyAddress);
        
        // this has to be executed for every L2 you want to support

        // Chain info parameters
        address crossDomainMessenger = 0x58Cc85b8D04EA49cC6DBd3CbFFd00B4B8D6cb3ef;
        address l2CrossTrade = 0xc0c33138355e061511f8954C114edC7c9E7Bfac4;
        address l2NativeTokenAddressOnL1 = 0x0000000000000000000000000000000000000000;
        address l1StandardBridge = 0xFBb0621E0B23b5478B630BD55a5f21f67730B0F1;
        address l1USDCBridge = 0xFBb0621E0B23b5478B630BD55a5f21f67730B0F1;
        uint256 l2ChainId = 11155420;
        
        console.log("Setting chain info with parameters:");
        console.log("CrossDomainMessenger:", crossDomainMessenger);
        console.log("L2CrossTrade:", l2CrossTrade);
        console.log("L2NativeTokenAddressOnL1:", l2NativeTokenAddressOnL1);
        console.log("L1StandardBridge:", l1StandardBridge);
        console.log("L1USDCBridge:", l1USDCBridge);
        console.log("L2ChainId:", l2ChainId);
        
        proxy.setChainInfo(
            crossDomainMessenger,
            l2CrossTrade,
            l2NativeTokenAddressOnL1,
            l1StandardBridge,
            l1USDCBridge,
            l2ChainId
        );
        
        console.log("Chain info set successfully!");

        vm.stopBroadcast();
    }
}