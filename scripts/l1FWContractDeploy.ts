import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const L1FastWithdrawProxyDep = await ethers.getContractFactory("L1FastWithdrawProxy");
  let L1FastWithdrawProxy = await L1FastWithdrawProxyDep.deploy();
  await L1FastWithdrawProxy.deployed();
  console.log('L1FastWithdrawProxy' , L1FastWithdrawProxy.address)

  const L1FastWithdrawLogicDep = await ethers.getContractFactory("L1FastWithdraw");
  let L1FastWithdrawLogic = await L1FastWithdrawLogicDep.deploy();
  await L1FastWithdrawLogic.deployed();
  console.log('L1FastWithdrawLogic' , L1FastWithdrawLogic.address)

  await (await L1FastWithdrawProxy.upgradeTo(
    L1FastWithdrawLogic.address)).wait()

  let imp2 = await L1FastWithdrawProxy.implementation()
  console.log('check upgradeAddress : ', imp2)
  console.log('upgradeTo done')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
