// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/L2/L2toL2CrossTradeProxy.sol";

contract SetChainInfoL2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Setting chain info for L2...");
        
        // L2 Proxy address (replace with actual deployed address)
        // ask if I need to get the params from the user as a forge command ?
        address proxyAddress = 0xc0c33138355e061511f8954C114edC7c9E7Bfac4;
        
        L2toL2CrossTradeProxy proxy = L2toL2CrossTradeProxy(proxyAddress);
        
        // Chain info parameters
        address l1CrossTrade = 0x1C5fc73342B0597827D2812Bb0955188903dA31f;
        uint256 chainId = 11155111;
        
        console.log("Setting chain info with parameters:");
        console.log("L1CrossTrade:", l1CrossTrade);
        console.log("ChainId:", chainId);
        
        proxy.setChainInfo(l1CrossTrade, chainId);
        
        console.log("Chain info set successfully!");

        vm.stopBroadcast();
    }
}
        