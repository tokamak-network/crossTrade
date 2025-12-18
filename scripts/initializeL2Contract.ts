import { ethers } from "hardhat";

async function main() {
  // Contract addresses and parameters
  const L2_CROSS_TRADE_ADDRESS = "0xfA49361F7c250eD804300fFB1a18fC19A0E6E0e4";
  const CROSS_DOMAIN_MESSENGER = "0x4200000000000000000000000000000000000007";
  const LEGACY_ERC20_ETH = "0x0000000000000000000000000000000000000000";

  console.log("Initializing L2 Cross Trade contract with parameters:");
  console.log("Cross Domain Messenger:", CROSS_DOMAIN_MESSENGER);
  console.log("Legacy ERC20 ETH:", LEGACY_ERC20_ETH);

  // Get contract instance
  const contract = await ethers.getContractAt("L2toL2CrossTradeProxy", L2_CROSS_TRADE_ADDRESS);

  // Call initialize
  console.log("\nCalling initialize...");
  const tx = await contract.initialize(
    CROSS_DOMAIN_MESSENGER,
    LEGACY_ERC20_ETH
  );
  
  console.log("Transaction hash:", tx.hash);
  
  console.log("Waiting for transaction confirmation...");
  const receipt = await tx.wait();
  
  console.log("\nTransaction details:");
  console.log("Block number:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Status:", receipt.status === 1 ? "Success" : "Failed");

  // Verify the initialization
  console.log("\nVerifying initialization...");
  const messenger = await contract.crossDomainMessenger();
  const eth = await contract.legacyERC20ETH();
  console.log("Verification - Cross Domain Messenger:", messenger);
  console.log("Verification - Legacy ERC20 ETH:", eth);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 