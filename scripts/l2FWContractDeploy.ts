import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const L2FastWithdrawProxyDep = await ethers.getContractFactory("L2FastWithdrawProxy");
  let L2FastWithdrawProxy = await L2FastWithdrawProxyDep.deploy();
  await L2FastWithdrawProxy.deployed();
  console.log('L2FastWithdrawProxy' , L2FastWithdrawProxy.address)

  const L2FastWithdrawLogicDep = await ethers.getContractFactory("L2FastWithdraw");
  let L2FastWithdrawLogic = await L2FastWithdrawLogicDep.deploy();
  await L2FastWithdrawLogic.deployed();
  console.log('L2FastWithdrawLogic' , L2FastWithdrawLogic.address)

  await (await L2FastWithdrawProxy.upgradeTo(
    L2FastWithdrawLogic.address)).wait()

  let imp2 = await L2FastWithdrawProxy.implementation()
  console.log('check upgradeAddress : ', imp2)
  console.log('upgradeTo done')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
