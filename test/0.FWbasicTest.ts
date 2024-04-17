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



describe("FWBasicTest", function () {
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

      let tx = await l2NativeTokenContract.balanceOf(
        l1Wallet.address
      )
      console.log('TON balance in L1(Wallet):', Number(tx.toString()))
      tx = await l2NativeTokenContract.balanceOf(
        l1user1.address
      )
      console.log('TON balance in L1(user1):', Number(tx.toString()))
      let l1Balance = await l1Wallet.getBalance()
      console.log('l1 native balance: (ETH) (Wallet)', l1Balance.toString())
      let l2Balance = await l2Wallet.getBalance()
      console.log('l2 native balance: (TON) (Wallet)', l2Balance.toString())
      l1Balance = await l1user1.getBalance()
      console.log('l1 native balance: (ETH) (user1)', l1Balance.toString())
      l2Balance = await l2user1.getBalance()
      console.log('l2 native balance: (TON) (user1)', l2Balance.toString())
    })
    
    it("L1FastWithdrawLogic", async () => {
      const L1FastWithdrawLogicDep = new ethers.ContractFactory(
        L1FastWithdraw_ABI.abi,
        L1FastWithdraw_ABI.bytecode,
        l1Wallet
      )

      L1FastWithdrawLogic = await L1FastWithdrawLogicDep.deploy()
      await L1FastWithdrawLogic.deployed()

      console.log("L1FasitWithdrawLogic :", L1FastWithdrawLogic.address);
    })

    it("L1FastWithdrawProxy", async () => {
      const L1FastWithdrawProxyDep = new ethers.ContractFactory(
        L1FastWithdrawProxy_ABI.abi,
        L1FastWithdrawProxy_ABI.bytecode,
        l1Wallet
      )

      L1FastWithdrawProxy = await L1FastWithdrawProxyDep.deploy()
      await L1FastWithdrawProxy.deployed()
      console.log("L1FastWithdrawProxy :", L1FastWithdrawProxy.address);
    })

    it("L1FastWithdrawProxy upgradeTo", async () => {
      await (await L1FastWithdrawProxy.upgradeTo(L1FastWithdrawLogic.address)).wait();
      let imp2 = await L1FastWithdrawProxy.implementation()
      console.log('check upgradeAddress : ', imp2)
      console.log('upgradeTo done')
    })

    it("set L1FastWithdraw", async () => {
      L1FastWithdrawContract = new ethers.Contract(
        L1FastWithdrawProxy.address,
        L1FastWithdraw_ABI.abi,
        l1Wallet
      )
    })

    it("L2FastWithdrawLogic", async () => {
      const L2FastWithdrawLogicDep = new ethers.ContractFactory(
        L2FastWithdraw_ABI.abi,
        L2FastWithdraw_ABI.bytecode,
        l2Wallet
      )

      L2FastWithdrawLogic = await L2FastWithdrawLogicDep.deploy()
      await L2FastWithdrawLogic.deployed()

      console.log("L2FasitWithdrawLogic :", L2FastWithdrawLogic.address);
    })

    it("L2FastWithdrawProxy", async () => {
      const L2FastWithdrawProxyDep = new ethers.ContractFactory(
        L2FastWithdrawProxy_ABI.abi,
        L2FastWithdrawProxy_ABI.bytecode,
        l2Wallet
      )

      L2FastWithdrawProxy = await L2FastWithdrawProxyDep.deploy()
      await L2FastWithdrawProxy.deployed()
      console.log("L2FastWithdrawProxy :", L2FastWithdrawProxy.address);
    })

    it("L2FastWithdrawProxy upgradeTo", async () => {
      await (await L2FastWithdrawProxy.upgradeTo(L2FastWithdrawLogic.address)).wait();
      let imp2 = await L2FastWithdrawProxy.implementation()
      console.log('check upgradeAddress : ', imp2)
      console.log('upgradeTo done')
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
      console.log('checkL1Inform :', checkL1Inform) 
      console.log('l1Contracts.L1CrossDomainMessenger :', l1Contracts.L1CrossDomainMessenger)
    })

    it("L2FastWithdraw initialize", async () => {
      await (await L2FastWithdrawProxy.connect(l2Wallet).initialize(
        l2CrossDomainMessengerAddr,
        L1FastWithdrawContract.address,
        predeployedAddress.LegacyERC20ETH,
        l2NativeTokenContract.address
      )).wait();
    
      const checkL2Inform = await L2FastWithdrawProxy.crossDomainMessenger()
      console.log("checkL2Inform :", checkL2Inform)
      console.log("l2CrossDomainMessengerAddr :", l2CrossDomainMessengerAddr)
      let tx = await L2FastWithdrawContract.salecount()
      console.log("salecount :", tx)
      tx = await L2FastWithdrawContract.l1fastWithdrawContract()
      console.log("l1fastWithdrawContract :", tx)
      tx = await L2FastWithdrawContract.LEGACY_ERC20_ETH()
      console.log("LEGACY_ERC20_ETH :", tx)
      tx = await L2FastWithdrawContract.LEGACY_l1token()
      console.log("LEGACY_l1token :", tx)
    })
  });

  describe("FW Test", () => {
    it("if dont have TON, get TON", async () => {
      let l2NativeTokenBalance = await l2NativeTokenContract.balanceOf(
        l1Wallet.address
      )
      console.log('native token(TON) balance in L1:', Number(l2NativeTokenBalance.toString()))
      if (Number(l2NativeTokenBalance.toString()) < Number(hundETH)) {
        console.log('start faucet')
        const tx = await l2NativeTokenContract.connect(l1Wallet).faucet(hundETH)
        await tx.wait()
        const l2NativeTokenBalance2 = await l2NativeTokenContract.balanceOf(
          l1Wallet.address
        )
        console.log('after faucet l2 native token(TON) balance in L1:', l2NativeTokenBalance2.toString())
      }
    })

    it("deposit TON", async () => {
      let l1Balance = await l1Wallet.getBalance()
      console.log('l1 native balance: ', l1Balance.toString())
      let l2Balance = await l2Wallet.getBalance()
      console.log('l2 native balance: ', l2Balance.toString())
      let l2NativeTokenBalance = await l2NativeTokenContract.balanceOf(l1Wallet.address)
      console.log(
        'native token(TON) balance in L1: ',
        l2NativeTokenBalance.toString()
      )

      const approveTx = await messenger.approveERC20(l2NativeToken, ETH, hundETH)
      await approveTx.wait()
      console.log('approveTx:', approveTx.hash)
    
      const depositTx = await messenger.depositERC20(l2NativeToken, ETH, hundETH)
      await depositTx.wait()
      console.log('depositTx:', depositTx.hash)
    
      await messenger.waitForMessageStatus(depositTx.hash, MessageStatus.RELAYED)
      l1Balance = await l1Wallet.getBalance()
      console.log('l1 native balance(ETH): ', l1Balance.toString())
      l2Balance = await l2Wallet.getBalance()
      console.log('l2 native balance(TON): ', l2Balance.toString())
      l2NativeTokenBalance = await l2NativeTokenContract.balanceOf(l1Wallet.address)
      console.log(
        'native token(TON) balance in L1: ',
        l2NativeTokenBalance.toString()
      )
    })

    it("requestFW in L2", async () => {
      let l2Balance = await l2Wallet.getBalance()
      console.log('l2 native balance(requester): ', l2Balance.toString())
      let L2FastWithdrawBalance = await l2Provider.getBalance(L2FastWithdrawContract.address)
      console.log('before l2 native balance (L2FastWithdrawBalance): ', L2FastWithdrawBalance.toString())
      await (await L2FastWithdrawContract.connect(l2Wallet).requestFW(
        predeployedAddress.LegacyERC20ETH,
        threeETH,
        twoETH,
        {
          value: threeETH
        }
      )).wait()
      l2Balance = await l2Wallet.getBalance()
      console.log('l2 native balance(requester): ', l2Balance.toString())
      L2FastWithdrawBalance = await l2Provider.getBalance(L2FastWithdrawContract.address)
      console.log('after l2 native balance (L2FastWithdrawBalance): ', L2FastWithdrawBalance.toString())

      const saleCount = await L2FastWithdrawProxy.salecount()
      console.log('saleCount : ', saleCount);
      expect(saleCount).to.be.equal(1);
      let saleInformation = await L2FastWithdrawProxy.dealData(saleCount)
      console.log('saleInformation : ', saleInformation);
    })

    it("faucet TON to user1", async () => {
      let l2NativeTokenBalance = await l2NativeTokenContract.balanceOf(
        l1user1.address
      )

      if (Number(l2NativeTokenBalance.toString()) === 0) {
        console.log('start faucet')
        const tx = await l2NativeTokenContract.connect(l1user1).faucet(twoETH)
        await tx.wait()
        const l2NativeTokenBalance2 = await l2NativeTokenContract.balanceOf(
          l1user1.address
        )
        console.log('after faucet l2 native token(TON) balance in L1 (user1):', l2NativeTokenBalance2.toString())
      }
    })

    it("providerFW(TON) in L1", async () => {
      let l2Balance = await l2Wallet.getBalance()
      console.log('l2 native balance(TON) (Wallet):', l2Balance.toString())

      let l2BalanceUser1 = await l2user1.getBalance()
      console.log('l2 native balance (TON) (User1): ', l2BalanceUser1.toString())

      let l2NativeTokenBalance = await l2NativeTokenContract.balanceOf(
        l1user1.address
      )
      console.log(
        'native token(TON) balance in L1 (user1): ',
        l2NativeTokenBalance.toString()
      )

      let l2NativeTokenBalanceWallet = await l2NativeTokenContract.balanceOf(
        l1Wallet.address
      )
      console.log(
        'native token(TON) balance in L1 (Wallet): ',
        l2NativeTokenBalanceWallet.toString()
      )
    
      const providerApproveTx = await l2NativeTokenContract.connect(l1user1).approve(L1FastWithdrawContract.address, twoETH)
      await providerApproveTx.wait()
      console.log("pass the L1 TON approve")
    
      const saleCount = await L2FastWithdrawProxy.salecount()
      console.log('saleCount : ', saleCount);

      const providerTx = await L1FastWithdrawContract.connect(l1user1).provideFW(
        l2NativeToken,
        l2Wallet.address,
        twoETH,
        saleCount,
        200000
      )
      await providerTx.wait()
      console.log("providerTx : ", providerTx.hash)
    
      await messenger.waitForMessageStatus(providerTx.hash, MessageStatus.RELAYED)
      console.log("send the Message L1 to L2");

      l2Balance = await l2Wallet.getBalance()
      console.log('l2 native balance(TON) (Wallet):', l2Balance.toString())

      l2BalanceUser1 = await l2user1.getBalance()
      console.log('l2 native balance (TON) (User1): ', l2BalanceUser1.toString())

      l2NativeTokenBalance = await l2NativeTokenContract.balanceOf(
        l1user1.address
      )
      console.log(
        'native token(TON) balance in L1 (user1): ',
        l2NativeTokenBalance.toString()
      )

      l2NativeTokenBalanceWallet = await l2NativeTokenContract.balanceOf(
        l1Wallet.address
      )

      console.log(
        'native token(TON) balance in L1 (Wallet): ',
        l2NativeTokenBalanceWallet.toString()
      )

      let L2FastWithdrawBalance = await l2Provider.getBalance(L2FastWithdrawContract.address)
      console.log('provider after l2 native balance (L2FastWithdrawBalance): ', L2FastWithdrawBalance.toString())

      let saleInformation = await L2FastWithdrawContract.dealData(1)
      console.log("saleInformation : ", saleInformation)

      let msgSenderCheck = await L2FastWithdrawContract.msgSender();
      console.log("msg.sender : ", msgSenderCheck)
    })
  })

});
