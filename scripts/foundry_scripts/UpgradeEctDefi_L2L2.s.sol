// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/L2/L2toL2CrossTradeProxy.sol";
import "../../contracts/L2/L2toL2CrossTradeL2.sol";

contract UpgradeEctDefi_L2L2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        L2toL2CrossTradeProxy proxy = L2toL2CrossTradeProxy(payable(0x2452ceB66Ccd4B997e3d400F90d42F2566AC0C94));

        console.log("Deploying L2toL2CrossTradeL2 logic...");
        L2toL2CrossTradeL2 logic = new L2toL2CrossTradeL2();
        console.log("Logic deployed at:", address(logic));

        console.log("Upgrading proxy...");
        proxy.upgradeTo(address(logic));
        console.log("Implementation:", proxy.implementation());

        console.log("Initializing with CDM...");
        proxy.initialize(0x4200000000000000000000000000000000000007);
        console.log("Done");

        vm.stopBroadcast();
    }
}
