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

  console.log("deploy logic")
  const L1CrossTradeLogicDep = await ethers.getContractFactory("L2toL2CrossTradeL1");
  let L1CrossTradeLogic = await L1CrossTradeLogicDep.deploy();
  let addressct = await L1CrossTradeLogic.getAddress(); 
  console.log('L1CrossTradeLogic' , addressct)
  await L1CrossTradeLogic.waitForDeployment()
  // const L1CrossTradeProxyLogic = new ethers.Contract(
  //   L1CrossTradeProxy.address,
  //   L1CrossTradeProxy_ABI.abi,
  //   l1Provider
  // ) 
  
  // console.log("upgrade proxy to logic...")
  // await L1CrossTradeProxy.upgradeTo(addressct);
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
