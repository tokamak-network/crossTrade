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

// PRIVATE_KEY=0X1233 forge script script/foundry_scripts/DeployL2CrossTrade.s.sol:DeployL2CrossTrade --rpc-url https://rpc.thanos-sepolia.tokamak.network --broadcast --verify --etherscan-api-key apykey --chain thanosSepolia
// PRIVATE_KEY=0X1233 forge script scripts/foundry_scripts/DeployL2CrossTrade.s.sol:DeployL2CrossTrade --rpc-url https://rpc.thanos-sepolia.tokamak.network --broadcast network thanosSepolia

// forge verify-contract 0x0000000000000000000000000000000000000000 contracts/L2/L2toL2CrossTradeL2.sol:L2toL2CrossTradeL2 --etherscan-api-key APYKEY --chain thanosSepolia
// forge verify-contract 0x0000000000000000000000000000000000000000 contracts/L2/L2toL2CrossTradeProxy.sol:L2toL2CrossTradeProxy --etherscan-api-key APYKEY --chain thanosSepolia
// ?? how do you verify the contract on a L2 SDK network? 