import { ethers } from "hardhat";

import L2CrossTradeARB_ABI from "../artifacts/contracts/L2/L2CrossTradeARB.sol/L2CrossTradeARB.json"

// import dotenv from "dotenv";
// dotenv.config();

async function main() {
  // Constants
  const L1_CROSS_TRADE_ADDRESS = "0xFa7641a09b0259CfCE57aEe540056364Bb3123E9";
  const NATIVE_TOKEN_L2 = "0x0000000000000000000000000000000000000000";  // ETH
  const ARB_SEPOLIA_CHAIN_ID = 421614;  // Arbitrum Sepolia Chain ID

  // Get contract instance
  let L2CrossTradeARB = await ethers.getContractAt(
    "L2CrossTradeARB",
    "0xCdD4f81Ef2592af1123F391508b308A1cFB36D48"  // Replace with your deployed contract address
  );

  console.log("Initializing L2CrossTradeARB...");
  await L2CrossTradeARB.initialize(
    L1_CROSS_TRADE_ADDRESS,
    NATIVE_TOKEN_L2,
    ARB_SEPOLIA_CHAIN_ID
  );
  console.log("Initialization complete");

  // Verify the initialization
  console.log("\nVerifying initialization:");
  console.log("L1CrossTradeContract:", await L2CrossTradeARB.l1CrossTradeContract());
  console.log("NativeTokenL2:", await L2CrossTradeARB.nativeTokenL2());
  console.log("ChainIdL1:", await L2CrossTradeARB.chainIdL1());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 