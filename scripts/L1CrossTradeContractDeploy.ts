import { ethers } from "hardhat";

import L1CrossTradeProxy_ABI from "../artifacts/contracts/L1/L1CrossTradeProxy.sol/L1CrossTradeProxy.json"

// import dotenv from "dotenv";
// dotenv.config();

async function main() {
  // const l1Provider = new ethers.providers.StaticJsonRpcProvider(
  //   process.env.Titan_L1_URL
  // )

  // const L1CrossTradeProxyDep = await ethers.getContractFactory("L1CrossTradeProxy");
  // let L1CrossTradeProxy = await L1CrossTradeProxyDep.deploy();
  // console.log('L1CrossTradeProxy' , await L1CrossTradeProxy.getAddress())

  // const L1CrossTradeLogicDep = await ethers.getContractFactory("L1CrossTrade");
  // let L1CrossTradeLogic = await L1CrossTradeLogicDep.deploy();
  // console.log('L1CrossTradeLogic' , await L1CrossTradeLogic.getAddress())

  // const L1CrossTradeProxyLogic = new ethers.Contract(
  //   L1CrossTradeProxy.address,
  //   L1CrossTradeProxy_ABI.abi,
  //   l1Provider
  // ) 
  
  let L1CrossTradeProxy = await ethers.getContractAt("L1CrossTradeProxy","0x00a13E2ED2c847D5Cf8e63D96749d73DED3DB4Fc");

  console.log("upgrade proxy to logic...")
  await L1CrossTradeProxy.upgradeTo("0xF5A8d00Fb9344607077642CD0795c6fCa7271547");
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
