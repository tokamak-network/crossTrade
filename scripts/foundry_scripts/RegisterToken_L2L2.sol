// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/L2/L2toL2CrossTradeProxy.sol";
import "../../contracts/L2/L2toL2CrossTradeL2.sol";

contract RegisterToken_L2L2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Registering token on L2...");
        
        // L2 Proxy address (replace with actual deployed address)
        address payable proxyAddress = payable(vm.envAddress("L2_PROXY_ADDRESS"));
        
        L2toL2CrossTradeL2 proxy = L2toL2CrossTradeL2(proxyAddress);
        
        // Token registration parameters
        address l1token = vm.envAddress("L1_TOKEN");
        address l2SourceToken = vm.envAddress("L2_SOURCE_TOKEN");
        address l2DestinationToken = vm.envAddress("L2_DESTINATION_TOKEN");
        uint256 l1ChainId = vm.envUint("L1_CHAIN_ID");
        uint256 l2SourceChainId = vm.envUint("L2_SOURCE_CHAIN_ID");
        uint256 l2DestinationChainId = vm.envUint("L2_DESTINATION_CHAIN_ID");
        
        console.log("Registering token with parameters:");
        console.log("L1Token:", l1token);
        console.log("L2SourceToken:", l2SourceToken);
        console.log("L2DestinationToken:", l2DestinationToken);
        console.log("L1ChainId:", l1ChainId);
        console.log("L2SourceChainId:", l2SourceChainId);
        console.log("L2DestinationChainId:", l2DestinationChainId);
        
        proxy.registerToken(
            l1token,
            l2SourceToken,
            l2DestinationToken,
            l1ChainId,
            l2SourceChainId,
            l2DestinationChainId
        );
        
        console.log("Token registered successfully!");

        vm.stopBroadcast();
    }
}

//  forge script scripts/foundry_scripts/RegisterToken_L2L2.sol:RegisterToken_L2L2 --rpc-url https://rpc.thanos-sepolia.tokamak.network --broadcast network thanosSepolia
