import { ethers } from "hardhat";

import L1CrossTradeProxy_ABI from "../artifacts/contracts/L1/L1CrossTradeProxy.sol/L1CrossTradeProxy.json"

// import dotenv from "dotenv";
// dotenv.config();

const L2crossTradeSourceAddress = "0xfA49361F7c250eD804300fFB1a18fC19A0E6E0e4";


async function main() {
  // approve the token first then try the register token
  // -----------------------------------------------------------
  let L2crossTradeSource = await ethers.getContractAt("L2toL2CrossTradeL2",L2crossTradeSourceAddress);
  console.log("request token")
  let tx = await L2crossTradeSource.requestNonRegisteredToken(
    "0x0000000000000000000000000000000000000000",
    "0x4200000000000000000000000000000000000486",
    "0x4200000000000000000000000000000000000486",
    "125000000000",
    "120000000000",
    "11155111",
    "111551119090",
    {value:"125000000000"}
  )
  console.log(tx.hash)
  console.log("Waiting for transaction receipt...");
  const receipt = await tx.wait();
  
  console.log("\nTransaction details:");
  console.log("Block number:", receipt?.blockNumber);
  console.log("Gas used:", receipt?.gasUsed.toString());
  console.log("Status:", receipt?.status === 1 ? "Success" : "Failed");

  console.log("\nEvents emitted:");
  for (const event of receipt?.logs || []) {
    try {
      const decoded = L2crossTradeSource.interface.parseLog(event);
      if (decoded) {
        console.log("\nEvent:", decoded.name);
        console.log("Arguments:", decoded.args);
      }
    } catch (e) {
      // Skip logs that can't be decoded by this contract's interface
      continue;
    }
  }
  // console.log(await L2crossTradeSource.saleCount());

  // await L2crossTradeSource.registerToken(
  //   "0x0000000000000000000000000000000000000000",
  //   "0x0000000000000000000000000000000000000000",
  //   "0x4200000000000000000000000000000000000486",
  //   "11155111",
  //   "55007",
  //   "111551119090"
  // )
  console.log("token registered");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
