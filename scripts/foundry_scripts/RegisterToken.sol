// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../contracts/L2/L2toL2CrossTradeProxy.sol";

contract RegisterToken is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Registering token on L2...");
        
        // L2 Proxy address (replace with actual deployed address)
        address proxyAddress = 0xc0c33138355e061511f8954C114edC7c9E7Bfac4;
        
        L2toL2CrossTradeProxy proxy = L2toL2CrossTradeProxy(proxyAddress);
        
        // Token registration parameters
        address l1token = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
        address l2SourceToken = 0x5fd84259d66cd46123540766be93dfe6d43130d7;
        address l2DestinationToken = 0x4200000000000000000000000000000000000778;
        uint256 l1ChainId = 11155111;
        uint256 l2SourceChainId = 11155420;
        uint256 l2DestinationChainId = 111551119090;
        
        console.log("Registering token with parameters:");
        console.log("L1Token:", l1token);
        console.log("L2SourceToken:", l2SourceToken);
        console.log("L2DestinationToken:", l2DestinationToken);
        console.log("L1ChainId:", l1ChainId);
        console.log("L2SourceChainId:", l2SourceChainId);
        console.log("L2DestinationChainId:", l2DestinationChainId);
        
        proxy.registerToken(
            l1token,
            l2SourceToken,
            l2DestinationToken,
            l1ChainId,
            l2SourceChainId,
            l2DestinationChainId
        );
        
        console.log("Token registered successfully!");

        vm.stopBroadcast();
    }
}