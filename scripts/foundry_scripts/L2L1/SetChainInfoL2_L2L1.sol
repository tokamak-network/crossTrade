// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../../contracts/L2/L2CrossTradeProxy.sol";

contract SetChainInfoL2_L2L1 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Setting chain info on L2CrossTradeProxy...");
        
        // L2 Proxy address
        address payable proxyAddress = payable(vm.envAddress("L2_CROSS_TRADE_PROXY"));
        
        L2CrossTradeProxy proxy = L2CrossTradeProxy(proxyAddress);
        
        // Chain info parameters for L2
        address l1CrossTrade = vm.envAddress("L1_CROSS_TRADE_PROXY");
        uint256 chainId = vm.envUint("L1_CHAIN_ID");
        
        console.log("Setting chain info with parameters:");
        console.log("L1 CrossTrade:", l1CrossTrade);
        console.log("L1 Chain ID:", chainId);
        
        proxy.setChainInfo(
            l1CrossTrade,
            chainId
        );
        
        console.log("Chain info set successfully on L2!");

        vm.stopBroadcast();
    }
}

// forge script scripts/foundry_scripts/L2L1/SetChainInfoL2_L2L1.sol:SetChainInfoL2_L2L1 --rpc-url https://rpc.thanos-sepolia.tokamak.network --broadcast network thanosSepolia 