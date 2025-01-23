import { ethers } from "hardhat";

import L2CrossTradeARB_ABI from "../artifacts/contracts/L2/L2CrossTradeARB.sol/L2CrossTradeARB.json"

// import dotenv from "dotenv";
// dotenv.config();

async function main() {
  // const l2Provider = new ethers.providers.StaticJsonRpcProvider(
  //   process.env.ARB_SEPOLIA_URL
  // )

  const L2CrossTradeARBDep = await ethers.getContractFactory("L2CrossTradeARB");
  let L2CrossTradeARB = await L2CrossTradeARBDep.deploy();
  console.log('L2CrossTradeARB', await L2CrossTradeARB.getAddress())

  // If you need to interact with existing deployment:
  // let L2CrossTradeARB = await ethers.getContractAt("L2CrossTradeARB", "YOUR_DEPLOYED_ADDRESS");

  // Constants for initialization (commented out as they belong in init script)
  // const L1_CROSS_TRADE_ADDRESS = "0xFa7641a09b0259CfCE57aEe540056364Bb3123E9";
  // const NATIVE_TOKEN_L2 = "0x0000000000000000000000000000000000000000";
  // const ARB_SEPOLIA_CHAIN_ID = 421614;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 