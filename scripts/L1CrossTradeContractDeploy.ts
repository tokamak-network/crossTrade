import { ethers } from "hardhat";

import L1CrossTradeProxy_ABI from "../artifacts/contracts/L1/L1CrossTradeProxy.sol/L1CrossTradeProxy.json"

// import dotenv from "dotenv";
// dotenv.config();

async function main() {
  // const l1Provider = new ethers.providers.StaticJsonRpcProvider(
  //   process.env.Titan_L1_URL
  // )

  const L1CrossTradeProxyDep = await ethers.getContractFactory("L1CrossTradeProxy");
  let L1CrossTradeProxy = await L1CrossTradeProxyDep.deploy();
  console.log('L1CrossTradeProxy' , L1CrossTradeProxy.address)

  const L1CrossTradeLogicDep = await ethers.getContractFactory("L1CrossTrade");
  let L1CrossTradeLogic = await L1CrossTradeLogicDep.deploy();
  console.log('L1CrossTradeLogic' , L1CrossTradeLogic.address)

  // const L1CrossTradeProxyLogic = new ethers.Contract(
  //   L1CrossTradeProxy.address,
  //   L1CrossTradeProxy_ABI.abi,
  //   l1Provider
  // ) 
  
  await (await L1CrossTradeProxy.upgradeTo(
    L1CrossTradeLogic.address)).wait()
  console.log("1")

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
