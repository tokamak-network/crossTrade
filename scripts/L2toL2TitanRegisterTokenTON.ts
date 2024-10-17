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
    "0xa30fe40285b8f5c0457dbc3b7c8a280373c40044",
    "0x7c6b91d9be155a6db01f749217d76ff02a7227f2",
    "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000",
    "1900000000000000000",
    "100000000000000000",
    "11155111",
    "111551119090",
  )

  // await L2crossTradeSource.registerToken(
  //   "0x42d3b260c761cD5da022dB56Fe2F89c4A909b04A",
  //   "0x79E0d92670106c85E9067b56B8F674340dCa0Bbd",
  //   "0x17Db5E789eca4Cd8DC45a310A4c5De45E47437aC",
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
