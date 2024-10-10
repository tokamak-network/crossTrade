import { ethers } from "hardhat";

import L1CrossTradeProxy_ABI from "../artifacts/contracts/L1/L1CrossTradeProxy.sol/L1CrossTradeProxy.json"
import Usdc_ABI from '../../artifacts/contracts/mockUsdc/v2/FiatTokenV2_2.sol/FiatTokenV2_2.json'

// import dotenv from "dotenv";
// dotenv.config();

async function main() {

  let L2crossTradeSource = await ethers.getContractAt("L2toL2CrossTradeL2","0x3357C9C11e850a7B7E28d6844f131083279EdC88");
  let UsdContract = await ethers.getContractAt("FiatTokenV2_2","0x79E0d92670106c85E9067b56B8F674340dCa0Bbd")
  console.log("name: ",await UsdContract.name());
  console.log(await L2crossTradeSource.crossDomainMessenger())
  console.log("request token")
  console.log("resgister token:")
  await L2crossTradeSource.requestRegisteredToken(
    "0x0000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000",
    "0x4200000000000000000000000000000000000486",
    "123000000000",
    "100000000000",
    "11155111",
    "111551119090",
    {value:"123000000000"}
  )

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
