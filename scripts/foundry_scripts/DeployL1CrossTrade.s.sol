// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/L1/L2toL2CrossTradeProxyL1.sol";
import "../../contracts/L1/L2toL2CrossTradeL1.sol";

contract DeployL1CrossTrade is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying L1 CrossTrade Proxy...");
        L2toL2CrossTradeProxyL1 proxy = new L2toL2CrossTradeProxyL1();
        console.log("L1CrossTradeProxy deployed at:", address(proxy));

        console.log("Deploying L1 CrossTrade Logic...");
        L2toL2CrossTradeL1 logic = new L2toL2CrossTradeL1();
        console.log("L1CrossTradeLogic deployed at:", address(logic));

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


// forge script script/foundry_scripts/DeployL1CrossTrade.s.sol:DeployL1CrossTrade --rpc-url https://sepolia.infura.io/v3/1234567890 --broadcast --verify --etherscan-api-key DZPZFZ7D5IG8RWDN8U4BG3NK9IBGEWDH3F --chain sepolia
// forge script script/foundry_scripts/DeployL1CrossTrade.s.sol:DeployL1CrossTrade --rpc-url https://sepolia.infura.io/v3/1234567890 --broadcast --chain sepolia

// forge verify-contract 0xA01bD9DB74800BC3189b1dba835DB006d03aD76c contracts/L1/L2toL2CrossTradeL1.sol:L2toL2CrossTradeL1 --etherscan-api-key DZPZFZ7D5IG8RWDN8U4BG3NK9IBGEWDH3F --chain sepolia
// forge verify-contract 0x0000000000000000000000000000000000000000 contracts/L1/L2toL2CrossTradeProxyL1.sol:L2toL2CrossTradeProxyL1 --etherscan-api-key DZPZFZ7D5IG8RWDN8U4BG3NK9IBGEWDH3F --chain sepolia