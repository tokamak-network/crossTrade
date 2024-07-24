import { ethers } from "hardhat";

import L1CrossTradeProxy_ABI from "../../artifacts/contracts/L1/L1CrossTradeProxy.sol/L1CrossTradeProxy.json"
import L1CrossTrade_ABI from "../../artifacts/contracts/L1/L1CrossTrade.sol/L1CrossTrade.json"
import L2CrossTradeProxy_ABI from "../../artifacts/contracts/L2/L2CrossTradeProxy.sol/L2CrossTradeProxy.json"
import L2CrossTrade_ABI from "../../artifacts/contracts/L2/L2CrossTrade.sol/L2CrossTrade.json"

// import dotenv from "dotenv";
// dotenv.config();

async function main() {
  const accounts = await ethers.getSigners()
  const deployer = accounts[0]

  const l1ProxyAddr = "0x48bD3707805CfDd51252383550c6879Dd3ac23B9"
  const l1LogicAddr = "0x56e7B6489e8012172766F348c6Be0f351B854880"
  const l2ProxyAddr = "0x8a9FB22AfA73083EE183cA8E751FaEab7efD7f23"
  const l2LogicAddr = "0x988A796F5ca1d4848d00daC1c17d0A2Bbca18a9b"

  const L1CrossTradeLogic = new ethers.Contract(
    l1ProxyAddr,
    L1CrossTrade_ABI.abi,
    deployer
  ) 
  console.log("L1 contract set done")
  const L2CrossTradeLogic = new ethers.Contract(
    l2ProxyAddr,
    L2CrossTrade_ABI.abi,
    deployer
  ) 
  console.log("L2 contract set done")

  const zeroAddr = '0x'.padEnd(42, '0')
  const zeroAddr2 = '0x0000000000000000000000000000000000000000'

  const sepoliaChainId = 11155111
  const titanSepoliaChainId = 55007

  const one = 10000000000000
  const two = 20000000000000
  const halfone = 5000000000000

  const saleCount = 2

  // let hash = encodeBytes32String("0x307837626161633134346436623137333839616137353135306265333238326137643933643339636136643330626563333431323931326236653964356133623266")
  // let hash = isBytesLike("0x7baac144d6b17389aa75150be3282a7d93d39ca6d30bec3412912b6e9d5a3b2f")
  // let hash = "0x7baac144d6b17389aa75150be3282a7d93d39ca6d30bec3412912b6e9d5a3b2f"
  // let byteshash = ethers.encodeBytes32String(hash);
  // let byteshash2 = ethers.getBytes(hash);
  let hash = await L1CrossTradeLogic.connect(deployer).getHash(
    zeroAddr2,
    zeroAddr2,
    deployer.address,
    two,
    one,
    saleCount,
    titanSepoliaChainId
  )
  console.log("hash : ", hash);
  // console.log("byteshash : ", byteshash);
  // console.log("byteshash2 : ", byteshash2);
  
  
  await (await L1CrossTradeLogic.connect(deployer).editFee(
    zeroAddr2,
    zeroAddr2,
    two,
    one,
    halfone,
    saleCount,
    titanSepoliaChainId,
    hash
  )).wait()
  console.log("editFee done")

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
