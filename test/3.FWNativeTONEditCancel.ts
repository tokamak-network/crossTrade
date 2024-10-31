import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
// import { task, types } from 'hardhat/config'
// import { HardhatRuntimeEnvironment } from 'hardhat/types'
// import '@nomiclabs/hardhat-ethers'
// import 'hardhat-deploy'
// import { ethers } from "hardhat";
import { BytesLike, ethers } from 'ethers'

import { CrossChainMessenger, MessageStatus, NativeTokenBridgeAdapter, NumberLike } from '../src'
import L1FastWithdrawProxy_ABI from "../artifacts/contracts/L1/L1FastWithdrawProxy.sol/L1FastWithdrawProxy.json"
import L1FastWithdraw_ABI from "../artifacts/contracts/L1/L1FastWithdraw.sol/L1FastWithdraw.json"
import L2FastWithdrawProxy_ABI from "../artifacts/contracts/L2/L2FastWithdrawProxy.sol/L2FastWithdrawProxy.json"
import L2FastWithdraw_ABI from "../artifacts/contracts/L2/L2FastWithdraw.sol/L2FastWithdraw.json"
import Proxy_ABI from "../artifacts/contracts/proxy/Proxy.sol/Proxy.json"


import dotenv from "dotenv" ;

dotenv.config();



describe("3.FWNativeTONEditCancel", function () {
  let network = "devnetL1"
  let deployedAddress = require('./data/deployed.'+network+'.json');
  let predeployedAddress = require('./data/predeployed.'+network+'.json');

  const erc20ABI = [
    {
      inputs: [
        { internalType: 'address', name: '_spender', type: 'address' },
        { internalType: 'uint256', name: '_value', type: 'uint256' },
      ],
      name: 'approve',
      outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ name: '_owner', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: 'balance', type: 'uint256' }],
      type: 'function',
    },
    {
      inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
      name: 'faucet',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'from',
          type: 'address'
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address'
        },
        {
          internalType: 'uint256',
          name: 'amount',
          type: 'uint256'
        }
      ],
      name: 'transferFrom',
      outputs: [
        {
          internalType: 'bool',
          name: '',
          type: 'bool'
        }
      ],
      stateMutability: 'nonpayable',
      type: 'function'
    },
  ]

  const privateKey = process.env.PRIVATE_KEY as BytesLike
  const privateKey2 = process.env.PRIVATE_KEY2 as BytesLike

  const l1Provider = new ethers.providers.StaticJsonRpcProvider(
    process.env.L1_URL
  )
  const l2Provider = new ethers.providers.StaticJsonRpcProvider(
    process.env.L2_URL
  )
  const l1Wallet = new ethers.Wallet(privateKey, l1Provider)
  console.log('l1Wallet :', l1Wallet.address)
  const l1user1 = new ethers.Wallet(privateKey2, l1Provider)
  console.log('l1user1 :', l1user1.address)
  const l2Wallet = new ethers.Wallet(privateKey, l2Provider)
  // console.log('l2Wallet :', l2Wallet.address)
  const l2user1 = new ethers.Wallet(privateKey2, l2Provider)

  const ETH = '0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000'

  const oneETH = ethers.utils.parseUnits('1', 18)
  const twoETH = ethers.utils.parseUnits('2', 18)
  const threeETH = ethers.utils.parseUnits('3', 18)
  // const fourETH = ethers.utils.parseUnits('4', 18)
  const fiveETH = ethers.utils.parseUnits('5', 18)
  const tenETH = ethers.utils.parseUnits('10', 18)
  const hundETH = ethers.utils.parseUnits('100', 18)

  const zeroAddr = '0x'.padEnd(42, '0')

  // let L1FastWithdrawLogicDep : any;
  let L1FastWithdrawLogic : any;
  let L1FastWithdrawProxy : any;
  let L1FastWithdrawContract : any;

  // let L2FastWithdrawProxyDep : any;
  let L2FastWithdrawLogic : any;
  let L2FastWithdrawProxy : any;
  let L2FastWithdrawContract : any;

  
  let deployer : any;

  let nativeTokenAddr = "0x75fE809aE1C4A66c27a0239F147d0cc5710a104A"

  const l2CrossDomainMessengerAddr = '0x4200000000000000000000000000000000000007'
  let l1Contracts : any;
  let bridges : any;
  let messenger : any;

  let l2NativeToken = process.env.NATIVE_TOKEN || ''
  let addressManager = process.env.ADDRESS_MANAGER || ''
  let l1CrossDomainMessenger = process.env.L1_CROSS_DOMAIN_MESSENGER || ''
  let l1StandardBridge = process.env.L1_STANDARD_BRIDGE || ''
  let optimismPortal = process.env.OPTIMISM_PORTAL || ''
  let l2OutputOracle = process.env.L2_OUTPUT_ORACLE || ''

  let l1ChainId : any;
  let l2ChainId : any;

  let l2NativeTokenContract : any;

  let beforeL2Balance : any;
  let afterL2Balance : any;
  let beforeL2Contract : any;
  let afterL2Contract : any;


  
  before('create fixture loader', async () => {
    // [deployer] = await ethers.getSigners();

    l1ChainId = (await l1Provider.getNetwork()).chainId
    l2ChainId = (await l2Provider.getNetwork()).chainId
    if (l2NativeToken === '') {
      l2NativeToken = deployedAddress.L2NativeToken
    }
  
    if (addressManager === '') {
      addressManager = deployedAddress.AddressManager
    }
  
    if (l1CrossDomainMessenger === '') {
      l1CrossDomainMessenger = deployedAddress.L1CrossDomainMessengerProxy
    }
  
    if (l1StandardBridge === '') {
      l1StandardBridge = deployedAddress.L1StandardBridgeProxy
    }
  
    if (optimismPortal === '') {
      optimismPortal = deployedAddress.OptimismPortalProxy
    }
  
    if (l2OutputOracle === '') {
      l2OutputOracle = deployedAddress.L2OutputOracleProxy
    }

    l1Contracts = {
      StateCommitmentChain: zeroAddr,
      CanonicalTransactionChain: zeroAddr,
      BondManager: zeroAddr,
      AddressManager: addressManager,
      L1CrossDomainMessenger: l1CrossDomainMessenger,
      L1StandardBridge: l1StandardBridge,
      OptimismPortal: optimismPortal,
      L2OutputOracle: l2OutputOracle,
    }
    // console.log(l1Contracts)

    bridges = {
      NativeToken: {
        l1Bridge: l1Contracts.L1StandardBridge,
        l2Bridge: predeployedAddress.L2StandardBridge,
        Adapter: NativeTokenBridgeAdapter,
      },
    }

    messenger = new CrossChainMessenger({
      bedrock: true,
      contracts: {
        l1: l1Contracts,
      },
      bridges,
      l1ChainId,
      l2ChainId,
      l1SignerOrProvider: l1Wallet,
      l2SignerOrProvider: l2Wallet,
    })
  
  })

  describe("deployContract", () => {
    it("l2NativeTokenContract", async () => {
      l2NativeTokenContract = new ethers.Contract(
        l2NativeToken,
        erc20ABI,
        l1Wallet
      )

      // let tx = await l2NativeTokenContract.balanceOf(
      //   l1Wallet.address
      // )
      // console.log('TON balance in L1(Wallet):', Number(tx.toString()))
      // tx = await l2NativeTokenContract.balanceOf(
      //   l1user1.address
      // )
      // console.log('TON balance in L1(user1):', Number(tx.toString()))
      // let l1Balance = await l1Wallet.getBalance()
      // console.log('l1 native balance: (ETH) (Wallet)', l1Balance.toString())
      // let l2Balance = await l2Wallet.getBalance()
      // console.log('l2 native balance: (TON) (Wallet)', l2Balance.toString())
      // l1Balance = await l1user1.getBalance()
      // console.log('l1 native balance: (ETH) (user1)', l1Balance.toString())
      // l2Balance = await l2user1.getBalance()
      // console.log('l2 native balance: (TON) (user1)', l2Balance.toString())
    })
    
    it("L1FastWithdrawLogic", async () => {
      const L1FastWithdrawLogicDep = new ethers.ContractFactory(
        L1FastWithdraw_ABI.abi,
        L1FastWithdraw_ABI.bytecode,
        l1Wallet
      )

      L1FastWithdrawLogic = await L1FastWithdrawLogicDep.deploy()
      await L1FastWithdrawLogic.deployed()

      // console.log("L1FasitWithdrawLogic :", L1FastWithdrawLogic.address);
    })

    it("L1FastWithdrawProxy", async () => {
      const L1FastWithdrawProxyDep = new ethers.ContractFactory(
        L1FastWithdrawProxy_ABI.abi,
        L1FastWithdrawProxy_ABI.bytecode,
        l1Wallet
      )

      L1FastWithdrawProxy = await L1FastWithdrawProxyDep.deploy()
      await L1FastWithdrawProxy.deployed()
      // console.log("L1FastWithdrawProxy :", L1FastWithdrawProxy.address);
    })

    it("L1FastWithdrawProxy upgradeTo", async () => {
      await (await L1FastWithdrawProxy.upgradeTo(L1FastWithdrawLogic.address)).wait();
      let imp2 = await L1FastWithdrawProxy.implementation()
      if(L1FastWithdrawLogic.address !== imp2) {
        console.log("===========L1FastWithdrawProxy upgradeTo ERROR!!===========")
      }
    })

    it("set L1FastWithdraw", async () => {
      L1FastWithdrawContract = new ethers.Contract(
        L1FastWithdrawProxy.address,
        L1FastWithdraw_ABI.abi,
        l1Wallet
      )
    })

    it("prepare to L2 deploy fee", async () => {
      let l2NativeTokenBalance = await l2NativeTokenContract.balanceOf(
        l1Wallet.address
      )

      if (Number(l2NativeTokenBalance.toString()) < Number(hundETH)) {
        const tx = await l2NativeTokenContract.connect(l1Wallet).faucet(hundETH)
        await tx.wait()
      }

      let beforel2NativeTokenBalance = await l2NativeTokenContract.balanceOf(l1Wallet.address)
      let beforel2Balance = await l2Wallet.getBalance()

      const approveTx = await messenger.approveERC20(l2NativeToken, ETH, hundETH)
      await approveTx.wait()
    
      const depositTx = await messenger.depositERC20(l2NativeToken, ETH, hundETH)
      await depositTx.wait()
    
      await messenger.waitForMessageStatus(depositTx.hash, MessageStatus.RELAYED)
      
      let afterl2NativeTokenBalance = await l2NativeTokenContract.balanceOf(l1Wallet.address)
      let afterl2Balance = await l2Wallet.getBalance()

      expect(afterl2Balance).to.be.gt(beforel2Balance)
      expect(beforel2NativeTokenBalance).to.be.gt(afterl2NativeTokenBalance)
    })

    it("L2FastWithdrawLogic", async () => {
      const L2FastWithdrawLogicDep = new ethers.ContractFactory(
        L2FastWithdraw_ABI.abi,
        L2FastWithdraw_ABI.bytecode,
        l2Wallet
      )

      L2FastWithdrawLogic = await L2FastWithdrawLogicDep.deploy()
      await L2FastWithdrawLogic.deployed()

      // console.log("L2FasitWithdrawLogic :", L2FastWithdrawLogic.address);
    })

    it("L2FastWithdrawProxy", async () => {
      const L2FastWithdrawProxyDep = new ethers.ContractFactory(
        L2FastWithdrawProxy_ABI.abi,
        L2FastWithdrawProxy_ABI.bytecode,
        l2Wallet
      )

      L2FastWithdrawProxy = await L2FastWithdrawProxyDep.deploy()
      await L2FastWithdrawProxy.deployed()
      // console.log("L2FastWithdrawProxy :", L2FastWithdrawProxy.address);
    })

    it("L2FastWithdrawProxy upgradeTo", async () => {
      await (await L2FastWithdrawProxy.upgradeTo(L2FastWithdrawLogic.address)).wait();
      let imp2 = await L2FastWithdrawProxy.implementation()
      if(L2FastWithdrawLogic.address !== imp2) {
        console.log("===========L2FastWithdrawProxy upgradeTo ERROR!!===========")
      }
    })

    it("set L2FastWithdraw", async () => {
      L2FastWithdrawContract = new ethers.Contract(
        L2FastWithdrawProxy.address,
        L2FastWithdraw_ABI.abi,
        l2Wallet
      )
    })

    it("L1FastWithdraw initialize", async () => {
      await (await L1FastWithdrawProxy.connect(l1Wallet).initialize(
        l1Contracts.L1CrossDomainMessenger,
        L2FastWithdrawContract.address,
        zeroAddr,
        l2NativeTokenContract.address
      )).wait()

      const checkL1Inform = await L1FastWithdrawProxy.crossDomainMessenger()
      if(checkL1Inform !== l1Contracts.L1CrossDomainMessenger){
        console.log("===========L1FastWithdraw initialize ERROR!!===========")
      }
    })

    it("L2FastWithdraw initialize", async () => {
      await (await L2FastWithdrawProxy.connect(l2Wallet).initialize(
        l2CrossDomainMessengerAddr,
        L1FastWithdrawContract.address,
        predeployedAddress.LegacyERC20ETH,
        l2NativeTokenContract.address
      )).wait();
    
      const checkL2Inform = await L2FastWithdrawProxy.crossDomainMessenger()
      if(checkL2Inform !== l2CrossDomainMessengerAddr){
        console.log("===========L2FastWithdraw initialize ERROR!!===========")
      }
      let tx = await L2FastWithdrawContract.saleCount()
      expect(tx).to.be.equal(0)
      tx = await L2FastWithdrawContract.l1fastWithdrawContract()
      if(tx !== L1FastWithdrawContract.address){
        console.log("===========L2FastWithdraw initialize ERROR!!===========")
      }
      tx = await L2FastWithdrawContract.legacyERC20ETH()
      if(tx !== predeployedAddress.LegacyERC20ETH){
        console.log("===========L2FastWithdraw initialize ERROR!!===========")
      }
      tx = await L2FastWithdrawContract.nativeL1token()
      if(tx !== l2NativeTokenContract.address){
        console.log("===========L2FastWithdraw initialize ERROR!!===========")
      }
    })
  });

  describe("FW edit, cancel Test", () => {
    it("if dont have TON, get TON", async () => {
      let l2NativeTokenBalance = await l2NativeTokenContract.balanceOf(
        l1Wallet.address
      )
      if (Number(l2NativeTokenBalance.toString()) < Number(hundETH)) {
        const tx = await l2NativeTokenContract.connect(l1Wallet).faucet(hundETH)
        await tx.wait()
      }
    })

    it("deposit TON", async () => {
      let beforel2NativeTokenBalance = await l2NativeTokenContract.balanceOf(l1Wallet.address)
      let beforel2Balance = await l2Wallet.getBalance()

      const approveTx = await messenger.approveERC20(l2NativeToken, ETH, hundETH)
      await approveTx.wait()
    
      const depositTx = await messenger.depositERC20(l2NativeToken, ETH, hundETH)
      await depositTx.wait()
    
      await messenger.waitForMessageStatus(depositTx.hash, MessageStatus.RELAYED)

      let afterl2NativeTokenBalance = await l2NativeTokenContract.balanceOf(l1Wallet.address)
      let afterl2Balance = await l2Wallet.getBalance()

      expect(afterl2Balance).to.be.gt(beforel2Balance)
      expect(beforel2NativeTokenBalance).to.be.gt(afterl2NativeTokenBalance)
    })

    it("requestFW (NativeTON) in L2", async () => {
      let beforel2Balance = await l2Wallet.getBalance()
      let beforeL2FastWithdrawBalance = await l2Provider.getBalance(L2FastWithdrawContract.address)

      await (await L2FastWithdrawContract.connect(l2Wallet).requestFW(
        l2NativeToken,
        predeployedAddress.LegacyERC20ETH,
        threeETH,
        twoETH,
        {
          value: threeETH
        }
      )).wait()

      let afterl2Balance = await l2Wallet.getBalance()
      let afterL2FastWithdrawBalance = await l2Provider.getBalance(L2FastWithdrawContract.address)

      const saleCount = await L2FastWithdrawProxy.saleCount()
      expect(saleCount).to.be.equal(1);

      expect(beforel2Balance).to.be.gt(afterl2Balance)
      expect(afterL2FastWithdrawBalance).to.be.gt(beforeL2FastWithdrawBalance)
    })

    it("before fail CancelFW", async () => {
      beforeL2Balance = await l2Wallet.getBalance()
      // console.log('l2 native balance(requester): ', beforeL2Balance.toString())
      beforeL2Contract = await l2Provider.getBalance(L2FastWithdrawContract.address)
      // console.log('before l2 native balance (L2FastWithdrawBalance): ', beforeL2Contract.toString())
    })

    it("revert the CancelFW (need the make the requestFW Owner)", async () => {
      const saleCount = await L2FastWithdrawProxy.saleCount()
      
      const cancelTx = await L1FastWithdrawContract.connect(l1user1).cancel(
        saleCount,
        1200000
      )
      await cancelTx.wait()
      // const receipt = await cancelTx.wait();
      // console.log("receipt :", receipt);
      // console.log("cancelTx : ", cancelTx.hash)

      await messenger.waitForMessageStatus(cancelTx.hash, MessageStatus.RELAYED)
      // console.log("send the Message L1 to L2");
    })

    it("after fail CancelFW", async () => {
      afterL2Balance = await l2Wallet.getBalance()
      // console.log('l2 native balance(requester): ', afterL2Balance.toString())
      afterL2Contract = await l2Provider.getBalance(L2FastWithdrawContract.address)
      // console.log('after l2 native balance (L2FastWithdrawBalance): ', afterL2Contract.toString())


      expect(beforeL2Balance).to.be.equal(afterL2Balance)
      expect(beforeL2Contract).to.be.equal(afterL2Contract)
    })

    it("cancelFW in L1", async () => {
      beforeL2Balance = await l2Wallet.getBalance()
      // console.log('before l2 native balance(requester): ', beforeL2Balance.toString())
      beforeL2Contract = await l2Provider.getBalance(L2FastWithdrawContract.address)
      // console.log('before l2 native balance (L2FastWithdrawBalance): ', beforeL2Contract.toString())
      

      const saleCount = await L2FastWithdrawProxy.saleCount()
      // let saleInformation = await L2FastWithdrawProxy.dealData(saleCount)

      const cancelTx = await L1FastWithdrawContract.connect(l1Wallet).cancel(
        saleCount,
        200000
      );
      await cancelTx.wait();
      // console.log("cancelTx : ", cancelTx.hash)

      await messenger.waitForMessageStatus(cancelTx.hash, MessageStatus.RELAYED)
      // console.log("send the Message L1 to L2");

      afterL2Balance = await l2Wallet.getBalance()
      // console.log('after l2 native balance(requester): ', afterL2Balance.toString())
      afterL2Contract = await l2Provider.getBalance(L2FastWithdrawContract.address)
      // console.log('after l2 native balance (L2FastWithdrawBalance): ', afterL2Contract.toString())

      expect(afterL2Balance).to.be.gt(beforeL2Balance)
      expect(beforeL2Contract).to.be.gt(afterL2Contract)
    })

    it("requestFW in L2 (second salecount)", async () => {
      let beforel2Balance = await l2Wallet.getBalance()
      let beforeL2FastWithdrawBalance = await l2Provider.getBalance(L2FastWithdrawContract.address)

      await (await L2FastWithdrawContract.connect(l2Wallet).requestFW(
        l2NativeToken,
        predeployedAddress.LegacyERC20ETH,
        threeETH,
        twoETH,
        {
          value: threeETH
        }
      )).wait()

      let afterl2Balance = await l2Wallet.getBalance()
      let afterL2FastWithdrawBalance = await l2Provider.getBalance(L2FastWithdrawContract.address)

      const saleCount = await L2FastWithdrawProxy.saleCount()
      expect(saleCount).to.be.equal(2);

      expect(beforel2Balance).to.be.gt(afterl2Balance)
      expect(afterL2FastWithdrawBalance).to.be.gt(beforeL2FastWithdrawBalance)
    })

    it("before fail editFW", async () => {
      beforeL2Balance = await l2Wallet.getBalance()
      // console.log('l2 native balance(requester): ', beforeL2Balance.toString())
      beforeL2Contract = await l2Provider.getBalance(L2FastWithdrawContract.address)
      // console.log('before l2 native balance (L2FastWithdrawBalance): ', beforeL2Contract.toString())
    })

    it("revert the editFW (need the make the requestFW Owner)", async () => {
      const saleCount = await L2FastWithdrawProxy.saleCount()
      // let saleInformation = await L2FastWithdrawProxy.dealData(saleCount)
      // console.log(saleInformation)
      
      const editTx = await L1FastWithdrawContract.connect(l1user1).edit(
        saleCount,
        oneETH,
        twoETH,
        1200000
      )
      await editTx.wait()
      // console.log("editTx : ", editTx.hash)
    
      await messenger.waitForMessageStatus(editTx.hash, MessageStatus.RELAYED)
      // console.log("send the Message L1 to L2");
    })

    it("after fail editFW", async () => {
      afterL2Balance = await l2Wallet.getBalance()
      // console.log('l2 native balance(requester): ', afterL2Balance.toString())
      afterL2Contract = await l2Provider.getBalance(L2FastWithdrawContract.address)
      // console.log('after l2 native balance (L2FastWithdrawBalance): ', afterL2Contract.toString())


      expect(beforeL2Balance).to.be.equal(afterL2Balance)
      expect(beforeL2Contract).to.be.equal(afterL2Contract)
    })

    it("edit in L1", async () => {
      let l2Balance = await l2Wallet.getBalance()
      // console.log('l2 native balance(requester): ', l2Balance.toString())
      let L2FastWithdrawBalance = await l2Provider.getBalance(L2FastWithdrawContract.address)
      // console.log('before l2 native balance (L2FastWithdrawBalance): ', L2FastWithdrawBalance.toString())

      const saleCount = await L2FastWithdrawProxy.saleCount()
      expect(saleCount).to.be.equal(2);

      const editTx = await L1FastWithdrawContract.connect(l1Wallet).edit(
        saleCount,
        oneETH,
        twoETH,
        200000
      )
      await editTx.wait()
      // console.log("editTx : ", editTx.hash)
    
      await messenger.waitForMessageStatus(editTx.hash, MessageStatus.RELAYED)
      // console.log("send the Message L1 to L2");

      let afterl2Balance = await l2Wallet.getBalance()
      // console.log('after l2 native balance(requester): ', afterl2Balance.toString())
      let afterL2FastWithdrawBalance = await l2Provider.getBalance(L2FastWithdrawContract.address)
      // console.log('after l2 native balance (L2FastWithdrawBalance): ', afterL2FastWithdrawBalance.toString())

      expect(afterl2Balance).to.be.gt(l2Balance)
      expect(L2FastWithdrawBalance).to.be.gt(afterL2FastWithdrawBalance)
    })

  })

});
