import { ethers } from "hardhat";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

async function main() {
  // Contract addresses
  const TOKEN_ADDRESS = "0x4200000000000000000000000000000000000486";
  const SPENDER_ADDRESS = "0xfA49361F7c250eD804300fFB1a18fC19A0E6E0e4";
  const AMOUNT = "1000000000000";

  // Get the token contract
  const token = await ethers.getContractAt(ERC20_ABI, TOKEN_ADDRESS);
  
  console.log("Approving token...");
  const tx = await token.approve(SPENDER_ADDRESS, AMOUNT);
  console.log("Approval transaction hash:", tx.hash);
  
  console.log("Waiting for transaction confirmation...");
  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);

  // Check allowance
  const [signer] = await ethers.getSigners();
  const allowance = await token.allowance(signer.address, SPENDER_ADDRESS);
  console.log("\nNew allowance:", allowance.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 