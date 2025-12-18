import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0xfA49361F7c250eD804300fFB1a18fC19A0E6E0e4";
  const BLOCKS_TO_SEARCH = 1000;

  console.log("Fetching relayMessage transactions for contract:", CONTRACT_ADDRESS);

  // Get current block
  const currentBlock = await ethers.provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - BLOCKS_TO_SEARCH);
  
  console.log(`\nSearching from block ${fromBlock} to ${currentBlock}`);

  // Get contract instance
  const contract = await ethers.getContractAt("L2toL2CrossTradeL2V2TRH", CONTRACT_ADDRESS);

  // Filter for RelayedMessage events
  const filter = {
    address: "0x4200000000000000000000000000000000000007", // L2CrossDomainMessenger address
    topics: [
      ethers.id("RelayedMessage(bytes32)"),
    ],
    fromBlock,
    toBlock: currentBlock
  };

  const events = await ethers.provider.getLogs(filter);
  console.log(`\nFound ${events.length} relay messages:\n`);

  for (const event of events) {
    const tx = await ethers.provider.getTransaction(event.transactionHash);
    const receipt = await ethers.provider.getTransactionReceipt(event.transactionHash);
    
    console.log(`\nTransaction: ${event.transactionHash}`);
    console.log(`Block #${event.blockNumber}`);
    console.log(`Status: ${receipt.status === 1 ? 'SUCCESS ✅' : 'FAILED ❌'}`);
    
    // Decode relayMessage call
    try {
      const iface = new ethers.Interface([
        "function relayMessage(uint256 _nonce, address _sender, address _target, uint256 _value, uint256 _minGasLimit, bytes _message) external"
      ]);
      const decodedInput = iface.parseTransaction({ data: tx.data });
      
      console.log("\nRelayMessage Details:");
      console.log("Nonce:", decodedInput.args._nonce.toString());
      console.log("Sender:", decodedInput.args._sender);
      console.log("Target:", decodedInput.args._target);
      console.log("Value:", ethers.formatEther(decodedInput.args._value), "ETH");
      console.log("Min Gas Limit:", decodedInput.args._minGasLimit.toString());
      
      
      // Try to decode the message payload
      try {
        // Try multiple function signatures to find the right one
        const functionSignatures = [
          "function providerClaimCT(address _l1token, address _l2SourceToken, address _l2DestinationToken, address _requester, address _provider, uint256 _totalAmount, uint256 _ctAmount, uint256 _saleCount, uint256 _l1ChainId, uint256 _l2SourceChainId, uint256 _l2DestinationChainId, bytes32 _hash)",
          "function providerClaimCT(address _provider, uint256 _totalAmount, uint256 _ctAmount, uint256 _saleCount, uint256 _l1ChainId, uint256 _l2SourceChainId, bytes32 _hash)"
        ];
        
        // Get the message payload
        const messagePayload = decodedInput.args._message;
        console.log("\nMessage Payload:", messagePayload);
        
        let decodedMessage = null;
        let usedSignature = "";
        
        for (const signature of functionSignatures) {
          try {
            const tempInterface = new ethers.Interface([signature]);
            decodedMessage = tempInterface.decodeFunctionData(
              "providerClaimCT",
              messagePayload
            );
            usedSignature = signature;
            break;
          } catch (e) {
            // Try next signature
          }
        }
        
        if (decodedMessage) {
          console.log("\nProvider Claim Details (using signature: " + usedSignature + "):");
          for (const [key, value] of Object.entries(decodedMessage)) {
            if (isNaN(Number(key)) && key !== "fragment") {
              console.log(`${key}:`, value.toString());
            }
          }
        } else {
          console.log("Could not decode message payload with any known signatures");
        }
      } catch (error) {
        console.log("Could not decode message payload:", error.message);
      }
    } catch (error) {
      console.log("Could not decode relayMessage call:", error.message);
    }

    // Show emitted events
    console.log("\nEvents Emitted:");
    for (const log of receipt.logs) {
      try {
        if (log.address === CONTRACT_ADDRESS) {
          // Try to decode the log directly
          const eventSignatures = [
            "event ProviderClaimCT(address indexed _l1token, address indexed _l2SourceToken, address indexed _l2DestinationToken, address _requester, address _provider, uint256 _totalAmount, uint256 _ctAmount, uint256 _saleCount, uint256 _l1ChainId, uint256 _l2SourceChainId, uint256 _l2DestinationChainId, bytes32 _hash)",
            "event ProviderClaimCT(address _provider, uint256 _totalAmount, uint256 _ctAmount, uint256 _saleCount, uint256 _l1ChainId, uint256 _l2SourceChainId, bytes32 _hash)"
          ];
          
          let decodedLog = null;
          
          // First try with contract interface
          try {
            decodedLog = contract.interface.parseLog({
              topics: log.topics,
              data: log.data
            });
          } catch (e) {
            // Try with custom interfaces
            for (const eventSig of eventSignatures) {
              try {
                const tempInterface = new ethers.Interface([eventSig]);
                decodedLog = tempInterface.parseLog({
                  topics: log.topics,
                  data: log.data
                });
                break;
              } catch (e) {
                // Try next signature
              }
            }
          }
          
          if (decodedLog) {
            console.log(`\nEvent: ${decodedLog.name}`);
            console.log("Arguments:");
            
            // Print all arguments
            for (const [key, value] of Object.entries(decodedLog.args)) {
              if (isNaN(Number(key))) {
                console.log(`${key}:`, value.toString());
              }
            }
          } else {
            console.log("\nRaw Log (could not decode):");
            console.log("Topics:", log.topics);
            console.log("Data:", log.data);
          }
        }
      } catch (error) {
        console.log("\nError decoding log:", error.message);
        console.log("Raw Log:");
        console.log("Topics:", log.topics);
        console.log("Data:", log.data);
      }
    }

    console.log("\n" + "-".repeat(50));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 