// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/L2/L2toL2CrossTradeProxy.sol";
import "../../contracts/L2/L2toL2CrossTradeL2.sol";

contract DeployL2CrossTrade is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying L2 CrossTrade Proxy...");
        L2toL2CrossTradeProxy proxy = new L2toL2CrossTradeProxy();
        console.log("L2CrossTradeProxy deployed at:", address(proxy));

        console.log("Deploying L2 CrossTrade Logic...");
        L2toL2CrossTradeL2 logic = new L2toL2CrossTradeL2();
        console.log("L2toL2CrossTradeLogic deployed at:", address(logic));

        console.log("Upgrading proxy to logic...");
        proxy.upgradeTo(address(logic));
        console.log("Proxy upgraded successfully");

        // Verify the upgrade worked
        address implementation = proxy.implementation();
        console.log("Current implementation address:", implementation);
        require(implementation == address(logic), "Upgrade failed - implementation mismatch");

        vm.stopBroadcast();
    }
} 

// forge script scripts/foundry_scripts/DeployL2CrossTrade.s.sol:DeployL2CrossTrade --rpc-url https://sepolia.optimism.io --broadcast --verify --etherscan-api-key ApyKey