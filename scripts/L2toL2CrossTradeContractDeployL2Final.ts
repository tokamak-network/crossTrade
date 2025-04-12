import { ethers } from "hardhat";

import L1CrossTradeProxy_ABI from "../artifacts/contracts/L1/L1CrossTradeProxy.sol/L1CrossTradeProxy.json"

// import dotenv from "dotenv";
// dotenv.config();

async function main() {
  
  // console.log("l2toL2proxy:....")
  // const L2CrossTradeProxyDep = await ethers.getContractFactory("L2toL2CrossTradeProxy");
  // let L2CrossTradeProxy = await L2CrossTradeProxyDep.deploy();
  // console.log('L2CrossTradeProxy' , await L2CrossTradeProxy.getAddress())

  // console.log("l2toL2CrossTrade:....")
  // let L2toL2CrossTradeLogicContract = await ethers.getContractFactory("L2toL2CrossTradeL2");
  // let L2toL2CrossTradeLogic = await L2toL2CrossTradeLogicContract.deploy();
  // let addressLogic = await L2toL2CrossTradeLogic.getAddress()
  // console.log('L2toL2CrossTradeLogic' , addressLogic)
  // await L2toL2CrossTradeLogic.waitForDeployment()

 
  let L2CrossTradeProxy = await ethers.getContractAt("L2CrossTradeProxy","0x6613f8652EAfdFFd95a49428313e52Cc9b77e38E");

  console.log("upgrade proxy to logic...")
  await L2CrossTradeProxy.upgradeTo("0xb542d1da9C75A6bBBEf9A84f11990cd27D89694D");
  console.log("upgraded")

  let imp2 = await L2CrossTradeProxy.implementation()
  console.log('check upgradeAddress : ', imp2)
  console.log('upgradeTo done')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
