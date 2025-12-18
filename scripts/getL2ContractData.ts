import { ethers } from "hardhat";

async function main() {
  // Contract address
  // old 0xCdD4f81Ef2592af1123F391508b308A1cFB36D48
  const L2_CROSS_TRADE_ADDRESS = "0xfA49361F7c250eD804300fFB1a18fC19A0E6E0e4";

  console.log("Getting data from L2 Cross Trade contract at:", L2_CROSS_TRADE_ADDRESS);
  
  // Get contract instance
  const contract = await ethers.getContractAt("L2toL2CrossTradeL2", L2_CROSS_TRADE_ADDRESS);

  // Get storage data
  console.log("\nContract Storage Data:");
  console.log("------------------------");
  
  const crossDomainMessenger = await contract.crossDomainMessenger();
  console.log("Cross Domain Messenger:", crossDomainMessenger);
  
  const legacyERC20ETH = await contract.legacyERC20ETH();
  console.log("Legacy ERC20 ETH:", legacyERC20ETH);
  
  const saleCount = await contract.saleCount();
  console.log("Sale Count:", saleCount.toString());

  // Optional: Get chain data for Sepolia
  const SEPOLIA_CHAIN_ID = "11155111";
  console.log("\nChain Data for Sepolia:");
  console.log("------------------------");
  const chainData = await contract.chainData(SEPOLIA_CHAIN_ID);
  console.log("L1 Cross Trade Contract:", chainData.l1CrossTradeContract);
  console.log("L1 TON:", chainData.l1TON);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 