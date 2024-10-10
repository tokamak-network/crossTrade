import { ethers } from "hardhat";

import L1CrossTradeProxy_ABI from "../artifacts/contracts/L1/L1CrossTradeProxy.sol/L1CrossTradeProxy.json"
import Usdc_ABI from '../../artifacts/contracts/mockUsdc/v2/FiatTokenV2_2.sol/FiatTokenV2_2.json'

// import dotenv from "dotenv";
// dotenv.config();

async function main() {

  let L2crossTradeSource = await ethers.getContractAt("L2toL2CrossTradeL2","0xc62DCF34b7741408d0CDd317410a3CC2d825Acc0");
  let UsdContract = await ethers.getContractAt("FiatTokenV2_2","0x17Db5E789eca4Cd8DC45a310A4c5De45E47437aC")
  console.log("name: ",await UsdContract.name());
  console.log(await L2crossTradeSource.crossDomainMessenger())
  console.log("request token ")
  
  

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
