// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../../contracts/L2/L2CrossTrade.sol";

contract RegisterToken is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Registering token for L2 to L1 CrossTrade...");
        
        // L2 Proxy address (replace with actual deployed address)
        address payable proxyAddress = payable(vm.envAddress("L2_PROXY_ADDRESS_L2_L1"));
        
        L2CrossTrade proxy = L2CrossTrade(proxyAddress);
        
        // Token registration parameters for L2 to L1
        address l1token = vm.envAddress("L1_TOKEN_L2_L1");
        address l2token = vm.envAddress("L2_TOKEN_L2_L1");
        uint256 l1ChainId = vm.envUint("L1_CHAIN_ID_L2_L1");
        
        console.log("Registering token with parameters:");
        console.log("L1Token:", l1token);
        console.log("L2Token:", l2token);
        console.log("L1ChainId:", l1ChainId);
        
        proxy.registerToken(
            l1token,
            l2token,
            l1ChainId
        );
        
        console.log("Token registered successfully for L2 to L1 trading!");

        vm.stopBroadcast();
    }
}

// forge script scripts/foundry_scripts/L2L1/RegisterToken.sol:RegisterToken --rpc-url https://rpc.thanos-sepolia.tokamak.network --broadcast network thanosSepolia