import { ethers } from "hardhat";

const ERC20_ABI = [
  "function approve(address spenderrr, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const BRIDGE_ABI = [
  "function bridgeERC20To(address _localToken, address _remoteToken, address _to, uint256 _amount, uint32 _minGasLimit, bytes _extraData) external"
];

async function main() {
  // Contract addresses
  const TOKEN_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // _localToken
  const BRIDGE_ADDRESS = "0x7dD2196722FBe83197820BF30e1c152e4FBa0a6A"; // Bridge contract address
  const REMOTE_TOKEN = "0x4200000000000000000000000000000000000778"; // _remoteToken
  const RECIPIENT = "0xB4032ff3335F0E54Fb0291793B35955e5dA30B0C"; // _to
  const AMOUNT = "12"; // _amount
  const MIN_GAS_LIMIT = 200000; // _minGasLimit
  const EXTRA_DATA = "0x"; // _extraData

  // Get the token contract
  const token = await ethers.getContractAt(ERC20_ABI, TOKEN_ADDRESS);
  const bridge = await ethers.getContractAt(BRIDGE_ABI, BRIDGE_ADDRESS);
  
  // // First approve the bridge to spend tokens
  // console.log("Approving token...");
  // const approveTx = await token.approve(BRIDGE_ADDRESS, AMOUNT);
  // console.log("Approval transaction hash:", approveTx.hash);
  
  // console.log("Waiting for approval confirmation...");
  // await approveTx.wait();
  // console.log("Approval confirmed");

  // // Check allowance
  // const [signer] = await ethers.getSigners();
  // const allowance = await token.allowance(signer.address, BRIDGE_ADDRESS);
  // console.log("\nNew allowance:", allowance.toString());

  // Now call bridgeUSDCTo
  console.log("\nBridging USDC...");
  const bridgeTx = await bridge.bridgeERC20To(
    TOKEN_ADDRESS,
    REMOTE_TOKEN,
    RECIPIENT,
    AMOUNT,
    MIN_GAS_LIMIT,
    EXTRA_DATA
  );
  console.log("Bridge transaction hash:", bridgeTx.hash);
  
  console.log("Waiting for bridge confirmation...");
  const bridgeReceipt = await bridgeTx.wait();
  console.log("Bridge transaction confirmed in block:", bridgeReceipt.blockNumber);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 