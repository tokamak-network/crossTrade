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

 
  let L2CrossTradeProxy = await ethers.getContractAt("L2CrossTradeProxy","0x0e58d178412032738A7f4C3b181f1E1efbCd5e3f");

  console.log("upgrade proxy to logic...")
  await L2CrossTradeProxy.upgradeTo("0x3c668427b26290Bf540FDE71A3C4677362c7f548");
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
