import { ethers } from "hardhat";

import L1CrossTradeARB_ABI from "../artifacts/contracts/L1/L1CrossTradeARB.sol/L1CrossTradeARB.json"

// import dotenv from "dotenv";
// dotenv.config();

async function main() {
  // const l1Provider = new ethers.providers.StaticJsonRpcProvider(
  //   process.env.Titan_L1_URL
  // )

  // Arbitrum Sepolia Constants
  const DELAYED_INBOX = "0xaAe29B0366299461418F5324a79Afc425BE5ae21";
  const L2_CROSS_TRADE_ADDRESS = "0xCdD4f81Ef2592af1123F391508b308A1cFB36D48";
  const ARB_SEPOLIA_CHAIN_ID = 421614;

  let L1CrossTradeARB = await ethers.getContractAt("L1CrossTradeARB", "0xFa7641a09b0259CfCE57aEe540056364Bb3123E9");

  console.log("Setting chain info...")
  await L1CrossTradeARB.setChainInfo(
    DELAYED_INBOX,
    L2_CROSS_TRADE_ADDRESS,
    ARB_SEPOLIA_CHAIN_ID
  );
  console.log("Chain info set")

  const chainData = await L1CrossTradeARB.chainData(ARB_SEPOLIA_CHAIN_ID)
  console.log('Verification - crossDomainMessenger:', chainData.crossDomainMessenger)
  console.log('Verification - l2CrossTradeContract:', chainData.l2CrossTradeContract)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 