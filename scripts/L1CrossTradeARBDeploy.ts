import { ethers } from "hardhat";

import L1CrossTradeARB_ABI from "../artifacts/contracts/L1/L1CrossTradeARB.sol/L1CrossTradeARB.json"

// import dotenv from "dotenv";
// dotenv.config();

async function main() {
  // const l1Provider = new ethers.providers.StaticJsonRpcProvider(
  //   process.env.Titan_L1_URL
  // )

  const L1CrossTradeARBDep = await ethers.getContractFactory("L1CrossTradeARB");
  let L1CrossTradeARB = await L1CrossTradeARBDep.deploy();
  console.log('L1CrossTradeARB', await L1CrossTradeARB.getAddress())

  // If you need to interact with an existing deployment:
  // let L1CrossTradeARB = await ethers.getContractAt("L1CrossTradeARB", "YOUR_DEPLOYED_ADDRESS");
  
  // Optional: Set chain info
  // console.log("Setting chain info...")
  // await L1CrossTradeARB.setChainInfo(
  //   "ARBITRUM_INBOX_ADDRESS",
  //   "L2_CROSSTRADE_ADDRESS",
  //   42161  // Arbitrum One chainId
  // );
  // console.log("Chain info set")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});