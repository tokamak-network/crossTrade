// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../../contracts/L1/L1CrossTradeProxy.sol";
import "../../../contracts/L1/L1CrossTrade.sol";

contract DeployL1CrossTrade_L2L1 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying L1CrossTradeProxy...");
        L1CrossTradeProxy proxy = new L1CrossTradeProxy();
        console.log("L1CrossTradeProxy deployed at:", address(proxy));

        console.log("Deploying L1CrossTrade logic...");
        L1CrossTrade logic = new L1CrossTrade();
        console.log("L1CrossTrade logic deployed at:", address(logic));

        console.log("Upgrading proxy to logic...");
        proxy.upgradeTo(address(logic));
        console.log("Proxy upgraded successfully");

        vm.stopBroadcast();
    }
}

// forge script scripts/foundry_scripts/L2L1/DeployL1CrossTrade_L2L1.s.sol:DeployL1CrossTrade_L2L1 --rpc-url https://eth-sepolia.public.blastapi.io --broadcast --chain sepolia 