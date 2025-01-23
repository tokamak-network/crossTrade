import { ethers } from "hardhat";

import L1CrossTradeProxy_ABI from "../artifacts/contracts/L1/L1CrossTradeProxy.sol/L1CrossTradeProxy.json"

// import dotenv from "dotenv";
// dotenv.config();

async function main() {
  // const l1Provider = new ethers.providers.StaticJsonRpcProvider(
  //   process.env.Titan_L1_URL
  // )
  // console.log("deploy l1ct proxy")
  // const L1CrossTradeProxyDep = await ethers.getContractFactory("L2toL2CrossTradeProxyL1");
  // let L1CrossTradeProxy = await L1CrossTradeProxyDep.deploy();
  // console.log('L1CrossTradeProxy' , await L1CrossTradeProxy.getAddress())
  // await L1CrossTradeProxy.waitForDeployment();

  console.log("deploy logic")
  const L1CrossTradeV1Dep = await ethers.getContractFactory("L1CrossTradeV1");
  let L1CrossTradeLogic = await L1CrossTradeV1Dep.deploy();
  let addressct = await L1CrossTradeLogic.getAddress(); 
  console.log('L1CrossTradeLogic' , addressct)
  await L1CrossTradeLogic.waitForDeployment()

  
  // let L1CrossTradeProxy = await ethers.getContractAt("L2toL2CrossTradeProxyL1","0xFAfCe7Ebd6B1e142f7C03050Ee19F2Ce43673901");

  // console.log("upgrade proxy to logic...")
  // await L1CrossTradeProxy.upgradeTo("0x6A3b4E3e83b873D9de9880D8d3AC2A4164B043D7");
  // console.log("upgraded")

  // let imp2 = await L1CrossTradeProxy.implementation()
  // console.log('check upgradeAddress : ', imp2)
  // console.log('upgradeTo done')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
