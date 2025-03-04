import { ethers } from "hardhat";

async function main() {
  // Contract addresses and parameters
 // old 0xCdD4f81Ef2592af1123F391508b308A1cFB36D48
  const L2_CROSS_TRADE_ADDRESS = "0xfA49361F7c250eD804300fFB1a18fC19A0E6E0e4"; // Your contract address
  const l1CrossTradeContract = "0x7593c75Af6e2087EBdB12f543d2ad7BA4DED55A5";
  const L1_LEGACY_ERC20 = "0x0000000000000000000000000000000000000000";
  const CHAIN_ID = "11155111";

  console.log("Setting chain info with parameters:");
  console.log("L1 Cross Trade:", l1CrossTradeContract);
  console.log("L1 Legacy ERC20:", L1_LEGACY_ERC20);
  console.log("Chain ID:", CHAIN_ID);

  // Get contract instance
  const contract = await ethers.getContractAt("L2toL2CrossTradeProxy", L2_CROSS_TRADE_ADDRESS);

  // Call setChainInfo
  console.log("\nCalling setChainInfo...");
  const tx = await contract.setChainInfo(
    l1CrossTradeContract,
    L1_LEGACY_ERC20,
    CHAIN_ID
  );
  
  console.log("Transaction hash:", tx.hash);
  
  console.log("Waiting for transaction confirmation...");
  const receipt = await tx.wait();
  
  console.log("\nTransaction details:");
  console.log("Block number:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Status:", receipt.status === 1 ? "Success" : "Failed");

  // Verify the chain info was set correctly
  console.log("\nVerifying chain info...");
  const chainData = await contract.chainData(CHAIN_ID);
  console.log("Verification - l1CrossTradeContract:", chainData.l1CrossTradeContract);
  console.log("Verification - l1TON:", chainData.l1TON);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 