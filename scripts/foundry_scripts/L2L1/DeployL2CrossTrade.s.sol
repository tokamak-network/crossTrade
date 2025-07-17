// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../../contracts/L2/L2CrossTradeProxy.sol";
import "../../../contracts/L2/L2CrossTrade.sol";

contract DeployL2CrossTrade is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address crossDomainMessenger = vm.envAddress("CROSS_DOMAIN_MESSENGER");
        address legacyERC20 = vm.envAddress("LEGACY_ERC20");
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
        proxy.initialize(crossDomainMessenger, legacyERC20);
        console.log("Proxy initialized with crossDomainMessenger:", crossDomainMessenger, "and legacyERC20:", legacyERC20);

        // Optionally, set chain info here if needed:
        // proxy.setChainInfo(_l1CrossTrade, _l1legacyERC20, _chainId);

        vm.stopBroadcast();
    }
} 