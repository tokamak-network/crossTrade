import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const L1FastWithdrawProxyDep = await ethers.getContractFactory("L1FastWithdrawProxy");
  let L1FastWithdrawProxy = await L1FastWithdrawProxyDep.deploy();
  console.log('L1FastWithdrawProxy' , L1FastWithdrawProxy.target)

  const L1FastWithdrawLogicDep = await ethers.getContractFactory("L1FastWithdraw");
  let L1FastWithdrawLogic = await L1FastWithdrawLogicDep.deploy();
  console.log('L1FastWithdrawLogic' , L1FastWithdrawLogic.target)

  const L1FastWithdrawProxyLogic = new ethers.Contract(
    predeploys.OptimismMintableERC20Factory,
    OptimismMintableERC20TokenFactoryABI.abi,
    l2Wallet
  ) 
  
  await (await L1FastWithdrawProxy.upgradeTo(
    L1FastWithdrawLogic.target)).wait()
  console.log("1")

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
