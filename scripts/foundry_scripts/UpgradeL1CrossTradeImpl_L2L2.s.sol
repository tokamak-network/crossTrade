// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/L1/L2toL2CrossTradeProxyL1.sol";
import "../../contracts/L1/L2toL2CrossTradeL1.sol";

/// @notice Deploys a new L2toL2CrossTradeL1 implementation and upgrades the existing proxy.
/// Usage:
///   PRIVATE_KEY=0x... forge script scripts/foundry_scripts/UpgradeL1CrossTradeImpl_L2L2.s.sol \
///     --rpc-url <sepolia_rpc> --broadcast --chain sepolia
contract UpgradeL1CrossTradeImpl_L2L2 is Script {
    // Existing proxy deployed on Sepolia
    address constant PROXY = 0xF09Af74810010a0e9A452f71B3921641350c21D0;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying new L2toL2CrossTradeL1 implementation...");
        L2toL2CrossTradeL1 newImpl = new L2toL2CrossTradeL1();
        console.log("New implementation deployed at:", address(newImpl));

        console.log("Upgrading proxy at:", PROXY);
        L2toL2CrossTradeProxyL1(payable(PROXY)).upgradeTo(address(newImpl));

        address current = L2toL2CrossTradeProxyL1(payable(PROXY)).implementation();
        console.log("Current implementation:", current);
        require(current == address(newImpl), "Upgrade failed: implementation mismatch");
        console.log("Upgrade successful.");

        vm.stopBroadcast();
    }
}
