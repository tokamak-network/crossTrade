import { ethers } from "hardhat";

const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

async function main() {
  const CONTRACT_ADDRESS = "0xfA49361F7c250eD804300fFB1a18fC19A0E6E0e4"; // Your contract address
  const BLOCKS_TO_SEARCH = 1000;
  const YOUR_ADDRESS = "0x21a82A114d65DB20d5db33f5c9DBb54f1a8AcF4e"; // Add your address here

  console.log("Fetching all token transfers...");

  // Get current block
  const currentBlock = await ethers.provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - BLOCKS_TO_SEARCH);
  
  console.log(`\nSearching from block ${fromBlock} to ${currentBlock}`);

  // Get all relevant token addresses
  const tokenAddresses = [
    "0x4200000000000000000000000000000000000486", 
    // Add other token addresses you want to monitor
  ];

  for (const tokenAddress of tokenAddresses) {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, ethers.provider);
    const symbol = await token.symbol().catch(() => "Unknown");
    const decimals = await token.decimals().catch(() => 18);

    console.log(`\nChecking transfers for token: ${symbol} (${tokenAddress})`);

    // Get transfers TO your address
    const receivedFilter = token.filters.Transfer(null, YOUR_ADDRESS);
    const receivedTransfers = await token.queryFilter(receivedFilter, fromBlock, currentBlock);

    // Get transfers FROM your address
    const sentFilter = token.filters.Transfer(YOUR_ADDRESS, null);
    const sentTransfers = await token.queryFilter(sentFilter, fromBlock, currentBlock);

    console.log("\nReceived Transfers:");
    for (const transfer of receivedTransfers) {
      const block = await transfer.getBlock();
      console.log(`\nTransaction: ${transfer.transactionHash}`);
      console.log(`Block: ${transfer.blockNumber} (${new Date(block.timestamp * 1000).toLocaleString()})`);
      console.log(`From: ${transfer.args.from}`);
      console.log(`Amount: ${ethers.formatUnits(transfer.args.value, decimals)} ${symbol}`);
      
      // Get transaction details
      const tx = await transfer.getTransaction();
      const receipt = await transfer.getTransactionReceipt();
      console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
      console.log(`Status: ${receipt.status === 1 ? 'SUCCESS ✅' : 'FAILED ❌'}`);
    }

    console.log("\nSent Transfers:");
    for (const transfer of sentTransfers) {
      const block = await transfer.getBlock();
      console.log(`\nTransaction: ${transfer.transactionHash}`);
      console.log(`Block: ${transfer.blockNumber} (${new Date(block.timestamp * 1000).toLocaleString()})`);
      console.log(`To: ${transfer.args.to}`);
      console.log(`Amount: ${ethers.formatUnits(transfer.args.value, decimals)} ${symbol}`);
      
      // Get transaction details
      const tx = await transfer.getTransaction();
      const receipt = await transfer.getTransactionReceipt();
      console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
      console.log(`Status: ${receipt.status === 1 ? 'SUCCESS ✅' : 'FAILED ❌'}`);
    }

    console.log("\n" + "-".repeat(50));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 