// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/L1/L2toL2CrossTradeProxyL1.sol";

contract SetChainInfoL1_L2L2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Setting chain info for L1...");
        
        address proxyAddress = vm.envAddress("L1_CROSS_TRADE_PROXY");
        
        L2toL2CrossTradeProxyL1 proxy = L2toL2CrossTradeProxyL1(payable(proxyAddress));
        
        // this has to be executed for every L2 you want to support

        // Chain info parameters
        address crossDomainMessenger = vm.envAddress("L1_CROSS_DOMAIN_MESSENGER");
        address l2CrossTrade = vm.envAddress("L2_CROSS_TRADE_PROXY");
        address l2NativeTokenAddressOnL1 = vm.envAddress("L2_NATIVE_TOKEN_ADDRESS_ON_L1");
        address l1StandardBridge = vm.envAddress("L1_STANDARD_BRIDGE");
        address l1USDCBridge = vm.envAddress("L1_USDC_BRIDGE");
        uint256 l2ChainId = vm.envUint("L2_CHAIN_ID");
        bool usesSimplifiedBridge = vm.envBool("USES_SIMPLIFIED_BRIDGE");
        
        console.log("Setting chain info with parameters:");
        console.log("CrossDomainMessenger:", crossDomainMessenger);
        console.log("L2CrossTrade:", l2CrossTrade);
        console.log("L2NativeTokenAddressOnL1:", l2NativeTokenAddressOnL1);
        console.log("L1StandardBridge:", l1StandardBridge);
        console.log("L1USDCBridge:", l1USDCBridge);
        console.log("L2ChainId:", l2ChainId);
        console.log("UsesSimplifiedBridge:", usesSimplifiedBridge);

        proxy.setChainInfo(
            crossDomainMessenger,
            l2CrossTrade,
            l2NativeTokenAddressOnL1,
            l1StandardBridge,
            l1USDCBridge,
            l2ChainId,
            usesSimplifiedBridge
        );
        
        console.log("Chain info set successfully!");

        vm.stopBroadcast();
    }
}

//  forge script scripts/foundry_scripts/SetChainInfoL1_L2L2.sol:SetChainInfoL1_L2L2 --rpc-url https://eth-sepolia.public.blastapi.io --broadcast --chain sepolia
