import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xCdD4f81Ef2592af1123F391508b308A1cFB36D48";
  const BLOCKS_TO_SEARCH = 1000;

  console.log("Fetching all transactions  for contract:", CONTRACT_ADDRESS);

  // Get current block
  const currentBlock = await ethers.provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - BLOCKS_TO_SEARCH);
  
  console.log(`\nSearching from block ${fromBlock} to ${currentBlock}`);

  // Get all transactions to the contract
  const filter = {
    address: CONTRACT_ADDRESS,
    fromBlock,
    toBlock: currentBlock
  };

  const events = await ethers.provider.getLogs(filter);
  console.log(`\nFound ${events.length} transactions:\n`);

  const contract = await ethers.getContractAt("L2toL2CrossTradeL2", CONTRACT_ADDRESS);

  for (const event of events) {
    const tx = await ethers.provider.getTransaction(event.transactionHash);
    const receipt = await ethers.provider.getTransactionReceipt(event.transactionHash);
    
    console.log(`\nTransaction: ${event.transactionHash}`);
    console.log(`Block #${event.blockNumber}`);
    console.log(`Status: ${receipt.status === 1 ? 'SUCCESS ✅' : 'FAILED ❌'}`);
    console.log("From:", tx.from);
    console.log("To:", tx.to);
    console.log("Value:", ethers.formatEther(tx.value), "ETH");
    console.log("Gas Used:", receipt.gasUsed.toString());
    console.log("Gas Price:", ethers.formatUnits(tx.gasPrice || 0, "gwei"), "gwei");

    // Try to decode transaction input data
    try {
      const decodedInput = contract.interface.parseTransaction({ data: tx.data });
      console.log("\nFunction Called:", decodedInput.name);
      console.log("Function Arguments:");
      for (const [key, value] of Object.entries(decodedInput.args)) {
        if (isNaN(Number(key))) {
          console.log(`${key}:`, value.toString());
        }
      }
    } catch (error) {
      console.log("Could not decode transaction input");
    }

    // Trace transaction (including internal calls)
    try {
      const trace = await ethers.provider.send("debug_traceTransaction", [event.transactionHash]);
      if (trace.calls && trace.calls.length > 0) {
        console.log("\nInternal Transactions:");
        for (const call of trace.calls) {
          console.log(`\nFrom: ${call.from}`);
          console.log(`To: ${call.to}`);
          console.log(`Type: ${call.type}`);
          console.log(`Value: ${ethers.formatEther(call.value || '0')} ETH`);
          if (call.error) {
            console.log(`Error: ${call.error} ❌`);
          }
        }
      }
    } catch (error) {
      console.log("Could not trace internal transactions");
    }

    // If transaction failed, try to get the revert reason
    if (receipt.status === 0) {
      try {
        await ethers.provider.call(
          {
            from: tx.from,
            to: tx.to,
            data: tx.data,
            gasLimit: tx.gasLimit,
            gasPrice: tx.gasPrice,
            value: tx.value
          },
          tx.blockNumber
        );
      } catch (error) {
        console.log("\nRevert reason:", error.message);
      }
    }

    // Get and decode events
    if (receipt.logs.length > 0) {
      console.log("\nEvents Emitted:");
      for (const log of receipt.logs) {
        try {
          const decodedLog = contract.interface.parseLog(log);
          console.log(`\nEvent: ${decodedLog.name}`);
          console.log("Arguments:");
          for (const [key, value] of Object.entries(decodedLog.args)) {
            if (isNaN(Number(key))) {
              console.log(`${key}:`, value.toString());
            }
          }
        } catch (error) {
          console.log("Could not decode log");
        }
      }
    }

    console.log("\n" + "-".repeat(50));
  }

  if (events.length === 0) {
    console.log("No transactions found in the specified block range");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 