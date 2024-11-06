import { ethers } from "hardhat";

import L1CrossTradeProxy_ABI from "../artifacts/contracts/L1/L1CrossTradeProxy.sol/L1CrossTradeProxy.json"

// import dotenv from "dotenv";
// dotenv.config();

async function main() {
  // const l1Provider = new ethers.providers.StaticJsonRpcProvider(
  //   process.env.Titan_L1_URL
  // )

  const L2CrossTradeProxyDep = await ethers.getContractFactory("L2CrossTradeProxy");
  let L2CrossTradeProxy = await L2CrossTradeProxyDep.deploy();
  console.log('L2CrossTradeProxy' , L2CrossTradeProxy.address)

  const L2CrossTradeLogicDep = await ethers.getContractFactory("L2CrossTrade");
  let L2CrossTradeLogic = await L2CrossTradeLogicDep.deploy();
  console.log('L2CrossTradeLogic' , L2CrossTradeLogic.address)

  // const L1CrossTradeProxyLogic = new ethers.Contract(
  //   L1CrossTradeProxy.address,
  //   L1CrossTradeProxy_ABI.abi,
  //   l1Provider
  // ) 
  
  await (await L2CrossTradeProxy.upgradeTo(
    L2CrossTradeLogic.address)).wait()
  console.log("1")

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
