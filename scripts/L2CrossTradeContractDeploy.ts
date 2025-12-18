import { ethers } from "hardhat";

import L1CrossTradeProxy_ABI from "../artifacts/contracts/L1/L1CrossTradeProxy.sol/L1CrossTradeProxy.json"

// import dotenv from "dotenv";
// dotenv.config();

async function main() {
  // const l1Provider = new ethers.providers.StaticJsonRpcProvider(
  //   process.env.Titan_L1_URL
  // )

  // console.log("L2proxy:....")
  // const L2CrossTradeProxyDep = await ethers.getContractFactory("L2CrossTradeProxy");
  // let L2CrossTradeProxy = await L2CrossTradeProxyDep.deploy();
  // console.log('L2CrossTradeProxy' , await L2CrossTradeProxy.getAddress())
  // await L2CrossTradeProxy.waitForDeployment()
  
  // console.log("L2CrossTradeLogic:....")
  // let L2CrossTradeLogicContract = await ethers.getContractFactory("L2CrossTrade");
  // let L2CrossTradeLogic = await L2CrossTradeLogicContract.deploy();
  // let addressLogic = await L2CrossTradeLogic.getAddress()
  // console.log('L2CrossTradeLogic' , addressLogic)
  // await L2CrossTradeLogic.waitForDeployment()

  // const L2CrossTradeProxy = await ethers.getContractAt("L2CrossTradeProxy","0xf7571F832b831dDbBA3F618A19EDC18F959673b4");
  // let L2CrossTradeLogic = await L2CrossTradeLogicDep.deploy();
  // console.log('L2CrossTradeLogic' , await L2CrossTradeLogic.getAddress())

  // const L1CrossTradeProxyLogic = new ethers.Contract(
  //   L1CrossTradeProxy.address,
  //   L1CrossTradeProxy_ABI.abi,
  //   l1Provider
  // ) 
  
  let L2CrossTradeProxy = await ethers.getContractAt("L2CrossTradeProxy","0xd520b0d021c779Df9296Fed737ee8d4ff87d512b");

  console.log("upgrade proxy to logic...")
  await L2CrossTradeProxy.upgradeTo("0xa3453f5b1e89b9Df59036B6a799f9EA84AAD8859");
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
