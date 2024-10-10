import { ethers } from "hardhat";

import L1CrossTradeProxy_ABI from "../artifacts/contracts/L1/L1CrossTradeProxy.sol/L1CrossTradeProxy.json"
import Usdc_ABI from '../../artifacts/contracts/mockUsdc/v2/FiatTokenV2_2.sol/FiatTokenV2_2.json'

// import dotenv from "dotenv";
// dotenv.config();

async function main() {

  let L2crossTradeSource = await ethers.getContractAt("L2toL2CrossTradeL1","0x36d1dc2ebc5702fe3a511b3a66953ce687ddab72");
  let UsdContract = await ethers.getContractAt("FiatTokenV2_2","0x42d3b260c761cD5da022dB56Fe2F89c4A909b04A")
  console.log("name: ",await UsdContract.name());
  // console.log(await L2crossTradeSource.crossDomainMessenger())
  console.log("request token ")
 

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
