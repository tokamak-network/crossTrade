import { ethers } from "hardhat";

import L2toL2CrossTradeL2V2TRH_ABI from "../artifacts/contracts/L2/L2toL2CrossTradeL2V2TRH.sol/L2toL2CrossTradeL2V2TRH.json"
import Usdc_ABI from '../../artifacts/contracts/mockUsdc/v2/FiatTokenV2_2.sol/FiatTokenV2_2.json'

// import dotenv from "dotenv";
// dotenv.config();

async function main() {
  // Contract addresses for Thanos network
  const L2_CROSS_TRADE_ADDRESS = "YOUR_DEPLOYED_L2_CROSS_TRADE_ADDRESS";
  const USDC_ADDRESS = "YOUR_USDC_ADDRESS";
  
  // Constants for registration
  const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
  const L2_ETH_ADDRESS = "YOUR_L2_ETH_ADDRESS";  // Thanos network ETH address
  const SEPOLIA_CHAIN_ID = 11155111;
  const THANOS_CHAIN_ID = "YOUR_THANOS_CHAIN_ID";
  const DESTINATION_CHAIN_ID = "YOUR_DESTINATION_CHAIN_ID";

  // Get contract instances
  let L2crossTradeSource = await ethers.getContractAt(
    "L2toL2CrossTradeL2V2TRH",
    L2_CROSS_TRADE_ADDRESS
  );
  
  let UsdContract = await ethers.getContractAt(
    "FiatTokenV2_2",
    USDC_ADDRESS
  );

  console.log("USDC Contract name:", await UsdContract.name());
  console.log("CrossDomainMessenger:", await L2crossTradeSource.crossDomainMessenger());

  // Register token
  console.log("Registering token...");
  await L2crossTradeSource.registerToken(
    ETH_ADDRESS,                // L1 token (ETH)
    ETH_ADDRESS,                // L2 source token (ETH)
    L2_ETH_ADDRESS,            // L2 destination token
    SEPOLIA_CHAIN_ID,          // L1 chain ID (Sepolia)
    THANOS_CHAIN_ID,           // L2 source chain ID (Thanos)
    DESTINATION_CHAIN_ID       // L2 destination chain ID
  );
  console.log("Token registered successfully");

  // Optional: Request registered token
  console.log("Requesting registered token...");
  const totalAmount = ethers.parseEther("0.123");
  const ctAmount = ethers.parseEther("0.1");
  
  await L2crossTradeSource.requestRegisteredToken(
    ETH_ADDRESS,                // L1 token (ETH)
    ETH_ADDRESS,                // L2 source token (ETH)
    L2_ETH_ADDRESS,            // L2 destination token
    "YOUR_REGISTRAR_ADDRESS",   // Registrar address
    totalAmount,                // Total amount
    ctAmount,                   // CT amount
    SEPOLIA_CHAIN_ID,          // L1 chain ID
    DESTINATION_CHAIN_ID,       // L2 destination chain ID
    { value: totalAmount }      // Send ETH with transaction
  );
  console.log("Token request submitted");

  // Optional: Check sale count
  // console.log("Sale count:", await L2crossTradeSource.saleCount());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 