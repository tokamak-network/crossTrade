import { ethers } from "hardhat";

import L1CrossTradeProxy_ABI from "../artifacts/contracts/L1/L1CrossTradeProxy.sol/L1CrossTradeProxy.json"
import Usdc_ABI from '../../artifacts/contracts/mockUsdc/v2/FiatTokenV2_2.sol/FiatTokenV2_2.json'

// import dotenv from "dotenv";
// dotenv.config();

async function main() {

  let L1crossTradeSource = await ethers.getContractAt("L2toL2CrossTradeL1","0x36d1dc2ebc5702fe3a511b3a66953ce687ddab72");
  let UsdContract = await ethers.getContractAt("FiatTokenV2_2","0x42d3b260c761cD5da022dB56Fe2F89c4A909b04A")
  console.log("name: ",await UsdContract.name());
  // console.log(await L1crossTradeSource.crossDomainMessenger())
  console.log("provideCt token")
  // console.log(await L1crossTradeSource.saleCount())
  let computedHash = await L1crossTradeSource.getHash(
    "0x42d3b260c761cD5da022dB56Fe2F89c4A909b04A",
    "0x79E0d92670106c85E9067b56B8F674340dCa0Bbd",
    "0x17Db5E789eca4Cd8DC45a310A4c5De45E47437aC",
    "0xB4032ff3335F0E54Fb0291793B35955e5dA30B0C",
    "5",
    "2",
    "1",
    "11155111",
    "55007",
    "111551119090"
  )
  console.log(computedHash)
  // console.log("approve before request");
  // await UsdContract.approve("0x36d1dc2ebc5702fe3a511b3a66953ce687ddab72","5000000000000000000");
  // console.log("approved");
  console.log("provideCt token:")
  let res = await L1crossTradeSource.provideCT(
    "0x42d3b260c761cD5da022dB56Fe2F89c4A909b04A",
    "0x79E0d92670106c85E9067b56B8F674340dCa0Bbd",
    "0x17Db5E789eca4Cd8DC45a310A4c5De45E47437aC",
    "0xB4032ff3335F0E54Fb0291793B35955e5dA30B0C",
    "5",
    "2",
    "1",
    "55007",
    "111551119090",
    "1000000",
    computedHash
  )
  console.log("resss:",res)
  console.log("token provided");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
