// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../../contracts/L1/L1CrossTradeProxy.sol";
import "../../../contracts/L1/L1CrossTrade.sol";

contract DeployL1CrossTrade is Script {
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

        // Optionally, set chain info here if needed:
        // proxy.setChainInfo(_crossDomainMessenger, _l2CrossTrade, _legacyERC20, _l1legacyERC20, _l2chainId);

        vm.stopBroadcast();
    }
} 