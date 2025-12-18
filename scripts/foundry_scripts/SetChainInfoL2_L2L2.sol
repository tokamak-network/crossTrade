// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/L2/L2toL2CrossTradeProxy.sol";

contract SetChainInfoL2_L2L2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Setting chain info for L2...");
        
        // L2 Proxy address (replace with actual deployed address)
        // ask if I need to get the params from the user as a forge command ?
        address payable proxyAddress = payable(vm.envAddress("L2_CROSS_TRADE_PROXY"));
        
        L2toL2CrossTradeProxy proxy = L2toL2CrossTradeProxy(proxyAddress);
        
        // Chain info parameters
        address l1CrossTrade = vm.envAddress("L1_CROSS_TRADE_PROXY");
        uint256 chainId = vm.envUint("L1_CHAIN_ID");
        
        console.log("Setting chain info with parameters:");
        console.log("L1CrossTrade:", l1CrossTrade);
        console.log("ChainId:", chainId);
        
        proxy.setChainInfo(l1CrossTrade, chainId);
        
        console.log("Chain info set successfully!");

        vm.stopBroadcast();
    }
}

// forge script scripts/foundry_scripts/SetChainInfoL2_L2L2.sol:SetChainInfoL2_L2L2 --rpc-url https://rpc.thanos-sepolia.tokamak.network --broadcast network thanosSepolia