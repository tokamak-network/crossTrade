import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer, BytesLike, Provider, ContractRunner, parseUnits } from 'ethers'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { Wallet } from '@ethersproject/wallet'
import L1FastWithdrawProxy_ABI from "../artifacts/contracts/L1/L1FastWithdrawProxy.sol/L1FastWithdrawProxy.json"
import L1FastWithdraw_ABI from "../artifacts/contracts/L1/L1FastWithdraw.sol/L1FastWithdraw.json"
import Proxy_ABI from "../artifacts/contracts/proxy/Proxy.sol/Proxy.json"


import dotenv from "dotenv" ;

dotenv.config();

describe("FWBasicTest", function () {
  
  const privateKey = process.env.PRIVATE_KEY as BytesLike
  const l1Provider = new StaticJsonRpcProvider(
    process.env.L1_URL
  )
  const l2Provider = new StaticJsonRpcProvider(
    process.env.L2_URL
  )
  const l1Wallet = new Wallet(privateKey, l1Provider)
  console.log('l1Wallet :', l1Wallet.address)
  const l2Wallet = new Wallet(privateKey, l2Provider)
  console.log('l2Wallet :', l2Wallet.address)

  const oneETH = parseUnits('1', 18)
  const twoETH = parseUnits('2', 18)

  // let L1FastWithdrawLogicDep : any;
  let L1FastWithdrawLogic : any;

  // let L1FastWithdrawProxyDep : any;
  let L1FastWithdrawProxy : any;
  
  let deployer : Signer;
  
  before('create fixture loader', async () => {
    [deployer] = await ethers.getSigners();
  })

  describe("deployContract", () => {
    it("L1FastWithdrawLogic", async () => {
      const L1FastWithdrawLogicDep = new ethers.ContractFactory(
        L1FastWithdraw_ABI.abi,
        L1FastWithdraw_ABI.bytecode,
        deployer
      )

      L1FastWithdrawLogic = await L1FastWithdrawLogicDep.deploy()
      console.log("L1FasitWithdrawLogic :", L1FastWithdrawLogic.target);
    })

    it("L1FastWithdrawLogic", async () => {
      const L1FastWithdrawProxyDep = new ethers.ContractFactory(
        L1FastWithdrawProxy_ABI.abi,
        L1FastWithdrawProxy_ABI.bytecode,
        deployer
      )

      L1FastWithdrawProxy = await L1FastWithdrawProxyDep.deploy()
      console.log("L1FastWithdrawProxy :", L1FastWithdrawProxy.target);
    })

    it("upgradeTo", async () => {
      let l1FastProxy = new ethers.Contract(
        L1FastWithdrawProxy.target,
        Proxy_ABI.abi,
        deployer
      )
      await l1FastProxy.upgradeTo(L1FastWithdrawLogic.target)
      let imp2 = await l1FastProxy.implementation()
      console.log('check upgradeAddress : ', imp2)
      console.log('upgradeTo done')
    })
  });

  describe("FW Test", () => {

  })

});
