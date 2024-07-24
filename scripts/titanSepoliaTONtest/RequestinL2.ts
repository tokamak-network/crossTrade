import { ethers } from "hardhat";

import L1CrossTradeProxy_ABI from "../../artifacts/contracts/L1/L1CrossTradeProxy.sol/L1CrossTradeProxy.json"
import L1CrossTrade_ABI from "../../artifacts/contracts/L1/L1CrossTrade.sol/L1CrossTrade.json"
import L2CrossTradeProxy_ABI from "../../artifacts/contracts/L2/L2CrossTradeProxy.sol/L2CrossTradeProxy.json"
import L2CrossTrade_ABI from "../../artifacts/contracts/L2/L2CrossTrade.sol/L2CrossTrade.json"
import L2StandardERC20_ABI from "../../artifacts/contracts/Mock/L2StandardERC20.sol/L2StandardERC20.json"


// import dotenv from "dotenv";
// dotenv.config();

async function main() {
  const accounts = await ethers.getSigners()
  const deployer = accounts[0]

  const l1ProxyAddr = "0x48bD3707805CfDd51252383550c6879Dd3ac23B9"
  const l1LogicAddr = "0x56e7B6489e8012172766F348c6Be0f351B854880"
  const l2ProxyAddr = "0x8a9FB22AfA73083EE183cA8E751FaEab7efD7f23"
  const l2LogicAddr = "0x988A796F5ca1d4848d00daC1c17d0A2Bbca18a9b"

  const L2CrossTradeLogic = new ethers.Contract(
    l2ProxyAddr,
    L2CrossTrade_ABI.abi,
    deployer
  ) 
  console.log("L2CrossTrade contract set done")

  
  const zeroAddr = '0x'.padEnd(42, '0')
  const zeroAddr2 = '0x0000000000000000000000000000000000000000'
  const L1TON = "0xa30fe40285B8f5c0457DbC3B7C8A280373c40044"
  const L2TON = "0x7c6b91d9be155a6db01f749217d76ff02a7227f2"

  const l2mockTON = new ethers.Contract(
    L2TON,
    L2StandardERC20_ABI.abi,
    deployer
  )
  console.log("L2TOn contract set done")

  const sepoliaChainId = 11155111
  const titanSepoliaChainId = 55007

  const one = 10000000000000
  const two = 20000000000000

  await (await l2mockTON.connect(deployer).approve(
    l2ProxyAddr,
    two
  )).wait()
  
  
  await (await L2CrossTradeLogic.connect(deployer).requestRegisteredToken(
    L1TON,
    L2TON,
    two,
    one,
    sepoliaChainId,
    {
      value: two
    }
  )).wait()
  console.log("requestRegisteredToken done")

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
