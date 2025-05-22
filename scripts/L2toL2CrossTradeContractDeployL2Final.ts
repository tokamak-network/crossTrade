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

 
  let L2CrossTradeProxy = await ethers.getContractAt("L2CrossTradeProxy","0x584fc2c9950730783Ad94114F9f04E308ACCc777");

  console.log("upgrade proxy to logic...")
  await L2CrossTradeProxy.upgradeTo("0xFe3D39dc5aF651DB0C1176F3d31D42bC6CCB7daa");
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
