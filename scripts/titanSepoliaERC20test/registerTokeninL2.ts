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

  const l1ProxyAddr = "0xc626fB5ad454eaA9E2E94943547698C19bf4d8c5"
  const l1LogicAddr = "0x5D768706B93Faa1DBc01810e4Ad0eCfcFd74C538"
  const l2ProxyAddr = "0x0c448437EDCb2a093266dF30619924AE8131b9E3"
  const l2LogicAddr = "0xD6e99ec486Afc8ae26d36a6Ab6240D1e0ecf0271"

  const L2CrossTradeLogic = new ethers.Contract(
    l2ProxyAddr,
    L2CrossTrade_ABI.abi,
    deployer
  ) 
  console.log("contract set done")

  const zeroAddr = '0x'.padEnd(42, '0')
  const zeroAddr2 = '0x0000000000000000000000000000000000000000'
  const L1TOS = "0xFF3Ef745D9878AfE5934Ff0b130868AFDDbc58e8"
  const L2TOS = "0xd08a2917653d4e460893203471f0000826fb4034"

  const sepoliaChainId = 11155111
  const titanSepoliaChainId = 55007

  const one = 10000000000000
  const two = 20000000000000
  
  await (await L2CrossTradeLogic.connect(deployer).registerToken(
    L1TOS,
    L2TOS,
    sepoliaChainId
  )).wait()
  console.log("registerToken done")

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
