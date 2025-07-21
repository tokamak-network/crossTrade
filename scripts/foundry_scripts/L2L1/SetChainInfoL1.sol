// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../../contracts/L1/L1CrossTradeProxy.sol";

contract SetChainInfoL1 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Setting chain info on L1CrossTradeProxy...");
        
        // L1 Proxy address
        address payable proxyAddress = payable(vm.envAddress("L1_PROXY_ADDRESS_L2_L1"));
        
        L1CrossTradeProxy proxy = L1CrossTradeProxy(proxyAddress);
        
        // Chain info parameters
        address crossDomainMessenger = vm.envAddress("CROSS_DOMAIN_MESSENGER_L2_L1");
        address l2CrossTrade = vm.envAddress("L2_CROSS_TRADE_L2_L1");
        uint256 l2chainId = vm.envUint("L2_CHAIN_ID_L2_L1");
        
        console.log("Setting chain info with parameters:");
        console.log("Cross Domain Messenger:", crossDomainMessenger);
        console.log("L2 CrossTrade:", l2CrossTrade);
        console.log("L2 Chain ID:", l2chainId);
        
        proxy.setChainInfo(
            crossDomainMessenger,
            l2CrossTrade,
            l2chainId
        );
        
        console.log("Chain info set successfully on L1!");

        vm.stopBroadcast();
    }
} 
// forge script scripts/foundry_scripts/L2L1/setChainInfoL1.sol:SetChainInfoL1 --rpc-url https://eth-sepolia.public.blastapi.io  --broadcast --chain sepolia