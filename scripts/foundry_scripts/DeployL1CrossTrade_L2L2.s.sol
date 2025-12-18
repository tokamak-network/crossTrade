// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/L1/L2toL2CrossTradeProxyL1.sol";
import "../../contracts/L1/L2toL2CrossTradeL1.sol";

contract DeployL1CrossTrade_L2L2 is Script {
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

        // Initialize the proxy
        console.log("Initializing proxy...");
        address usdcAddress = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
        address usdtAddress = 0x7169D38820dfd117C3FA1f22a697dBA58d90BA06;
        proxy.initialize(usdcAddress, usdtAddress);
        console.log("Proxy initialized with USDC address:", usdcAddress, "and USDT address:", usdtAddress);

        vm.stopBroadcast();
    }
} 


// PRIVATE_KEY=0X1233 forge script scripts/foundry_scripts/DeployL1CrossTrade_L2L2.s.sol:DeployL1CrossTrade_L2L2 --rpc-url https://sepolia.infura.io/v3/1234567890 --broadcast --verify --etherscan-api-key apykey --chain sepolia
// PRIVATE_KEY=0X1233 forge script scripts/foundry_scripts/DeployL1CrossTrade_L2L2.s.sol:DeployL1CrossTrade_L2L2 --rpc-url https://sepolia.infura.io/v3/1234567890 --broadcast --chain sepolia

// forge verify-contract 0xA01bD9DB74800BC3189b1dba835DB006d03aD76c contracts/L1/L2toL2CrossTradeL1.sol:L2toL2CrossTradeL1 --etherscan-api-key apyKey --chain sepolia
// forge verify-contract 0x0000000000000000000000000000000000000000 contracts/L1/L2toL2CrossTradeProxyL1.sol:L2toL2CrossTradeProxyL1 --etherscan-api-key APYKEY --chain sepolia