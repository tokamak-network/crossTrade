// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../../contracts/L2/L2CrossTradeProxy.sol";
import "../../../contracts/L2/L2CrossTrade.sol";

contract DeployL2CrossTrade is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address crossDomainMessenger = vm.envAddress("CROSS_DOMAIN_MESSENGER");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying L2CrossTradeProxy...");
        L2CrossTradeProxy proxy = new L2CrossTradeProxy();
        console.log("L2CrossTradeProxy deployed at:", address(proxy));

        console.log("Deploying L2CrossTrade logic...");
        L2CrossTrade logic = new L2CrossTrade();
        console.log("L2CrossTrade logic deployed at:", address(logic));

        console.log("Upgrading proxy to logic...");
        proxy.upgradeTo(address(logic));
        console.log("Proxy upgraded successfully");

        console.log("Initializing proxy...");
        proxy.initialize(crossDomainMessenger);
        console.log("Proxy initialized with crossDomainMessenger:", crossDomainMessenger);
        vm.stopBroadcast();
    }
} 
// PRIVATE_KEY=0x1234567890 forge script scripts/foundry_scripts/L2L1/DeployL2CrossTrade.s.sol:DeployL2CrossTrade --rpc-url https://rpc.thanos-sepolia.tokamak.network --broadcast network thanosSepolia