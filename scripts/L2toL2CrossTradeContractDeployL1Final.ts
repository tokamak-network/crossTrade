import { ethers } from "hardhat";

import L1CrossTradeProxy_ABI from "../artifacts/contracts/L1/L1CrossTradeProxy.sol/L1CrossTradeProxy.json"

// import dotenv from "dotenv";
// dotenv.config();

async function main() {

  // console.log("deploy l1ct proxy")
  // const L1CrossTradeProxyDep = await ethers.getContractFactory("L2toL2CrossTradeProxyL1");
  // let L1CrossTradeProxy = await L1CrossTradeProxyDep.deploy();
  // console.log('L1CrossTradeProxy' , await L1CrossTradeProxy.getAddress())
  // await L1CrossTradeProxy.waitForDeployment();

  // console.log("deploy logic")
  // const L1CrossTradeLogicDep = await ethers.getContractFactory("L2toL2CrossTradeL1");
  // let L1CrossTradeLogic = await L1CrossTradeLogicDep.deploy();
  // let addressct = await L1CrossTradeLogic.getAddress(); 
  // console.log('L1CrossTradeLogic' , addressct)
  // await L1CrossTradeLogic.waitForDeployment()

  
  let L1CrossTradeProxy = await ethers.getContractAt("L2toL2CrossTradeProxyL1","0x8518BC1910955598dEF216EF68FcDD0ED3AF2faF");

  console.log("upgrade proxy to logic...")
  await L1CrossTradeProxy.upgradeTo("0xeb96FF8472c5476D77a59ef0bc54430b69A3e399");
  console.log("upgraded")

  let imp2 = await L1CrossTradeProxy.implementation()
  console.log('check upgradeAddress : ', imp2)
  console.log('upgradeTo done')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
