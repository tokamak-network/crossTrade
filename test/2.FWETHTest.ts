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
import { ethers } from "hardhat";
import { BytesLike, Event } from 'ethers'

import { CrossChainMessenger, MessageStatus, NativeTokenBridgeAdapter, NumberLike } from '../src'
import L1FastWithdrawProxy_ABI from "../artifacts/contracts/L1/L1FastWithdrawProxy.sol/L1FastWithdrawProxy.json"
import L1FastWithdraw_ABI from "../artifacts/contracts/L1/L1FastWithdraw.sol/L1FastWithdraw.json"
import L2FastWithdrawProxy_ABI from "../artifacts/contracts/L2/L2FastWithdrawProxy.sol/L2FastWithdrawProxy.json"
import L2FastWithdraw_ABI from "../artifacts/contracts/L2/L2FastWithdraw.sol/L2FastWithdraw.json"
import L1StandardBridgeABI from '../contracts-bedrock/forge-artifacts/L1StandardBridge.sol/L1StandardBridge.json'
import OptimismMintableERC20TokenFactoryABI from '../contracts-bedrock/forge-artifacts/OptimismMintableERC20Factory.sol/OptimismMintableERC20Factory.json'
import OptimismMintableERC20TokenABI from '../contracts-bedrock/forge-artifacts/OptimismMintableERC20.sol/OptimismMintableERC20.json'
import MockERC20ABI from '../contracts-bedrock/forge-artifacts/MockERC20Token.sol/MockERC20Token.json'

import dotenv from "dotenv" ;

dotenv.config();

describe("ETH FastWithdraw Test", function () {
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

  let MockERC20 : any;
  let l2MockERC20 : any;

  const name = 'Mock'
  const symbol = 'MTK'

  const l2name = 'L2Mock'
  const l2symbol = 'LTK'

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
  let L1StandardBridgeContract : any;
  let L2FastWithdrawBalance : any;
  let l2ETHERC20 : any;
  
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

    it("deploy MockERC20 in L1", async () => {
      const DeployMockERC20 = new ethers.ContractFactory(
        MockERC20ABI.abi,
        MockERC20ABI.bytecode,
        l1Wallet
      )
      MockERC20 = await DeployMockERC20.deploy(name,symbol)
      await MockERC20.deployed()
      await MockERC20.mint(l1Wallet.address, tenETH)
      await MockERC20.mint(l1user1.address, tenETH)
    })

    it("deploy MockERC20 in L2", async () => {
      const factory_OptimismMintable = new ethers.Contract(
        predeployedAddress.OptimismMintableERC20Factory,
        OptimismMintableERC20TokenFactoryABI.abi,
        l2Wallet
      )

      let tx = await factory_OptimismMintable.createOptimismMintableERC20(
        MockERC20.address,
        l2name,
        l2symbol
      )
      await tx.wait()

      const receipt = await tx.wait()
      const event = receipt.events.find(
        (e: Event) => e.event === 'OptimismMintableERC20Created'
      )
    
      if (!event) {
        throw new Error('Unable to find OptimismMintableERC20Created event')
      }

      l2MockERC20 = new ethers.Contract(
        event.args.localToken,
        OptimismMintableERC20TokenABI.abi,
        l2Wallet
      )
    })

    it("Set L1StandrardBridgeContract", async () => {
      L1StandardBridgeContract = new ethers.Contract(
        l1Contracts.L1StandardBridge,
        L1StandardBridgeABI.abi,
        l1Wallet
      )
    })

    it("deploy the L2ETH Contract", async () => {
      l2ETHERC20 = new ethers.Contract(
        predeployedAddress.ETH,
        erc20ABI,
        l2Wallet
      )
    })
  });

  describe("FW ETH Test", () => {
    it("before deposit check L1ETH, L2ETH", async () => {
      let l1Balance = await l1Wallet.getBalance()
      console.log('l1 native balance(ETH) (Wallet): ', l1Balance.toString())
      let l2ETHBalance = await l2ETHERC20.balanceOf(l2Wallet.address)
      console.log('l2 ETH(ERC20) balance (Wallet): ', l2ETHBalance.toString())
    })

    it("Deposit ETH to L2", async () => {
      const tx = await L1StandardBridgeContract.connect(l1Wallet).depositETH(
        20000,
        '0x',
        {
          value: threeETH,
        }
      )
    
      const depositTx = await tx.wait()
      console.log(
        'depositTx Tx:',
        depositTx.transactionHash,
        ' Block',
        depositTx.blockNumber,
        ' hash',
        tx.hash
      )
    
      await messenger.waitForMessageStatus(
        depositTx.transactionHash,
        MessageStatus.RELAYED
      )
    })

    it("after deposit check L1ETH, L2ETH", async () => {
      let l1Balance = await l1Wallet.getBalance()
      console.log('l1 native balance(ETH) (Wallet): ', l1Balance.toString())
      let l2ETHBalance = await l2ETHERC20.balanceOf(l2Wallet.address)
      console.log('l2 ETH(ERC20) balance (Wallet): ', l2ETHBalance.toString())
    })

    it("requestFW (ETH) in L2", async () => {
      let l1BalanceUser1 = await l1user1.getBalance()
      console.log('l1 native balance (ETH) (User1): ', l1BalanceUser1.toString())
      let l2ETHBalanceUser1 = await l2ETHERC20.balanceOf(l2user1.address)
      console.log('l2 ETH(ERC20) balance (User1): ', l2ETHBalanceUser1.toString())

      L2FastWithdrawBalance = await l2ETHERC20.balanceOf(L2FastWithdrawContract.address)
      console.log('before L2 ETH (L2FastWithdrawBalance): ', L2FastWithdrawBalance.toString())

      let tx = await l2ETHERC20.connect(l2Wallet).approve(L2FastWithdrawContract.address, threeETH)
      await tx.wait()
      console.log('pass the approve')

      await (await L2FastWithdrawContract.connect(l2Wallet).requestFW(
        l2ETHERC20.address,
        threeETH,
        twoETH
      )).wait()
      console.log('pass the request')

      let l2MockBalance = await l2MockERC20.balanceOf(l2Wallet.address)
      console.log('l2MockBalance: ', l2MockBalance.toString())
      L2FastWithdrawBalance = await l2ETHERC20.balanceOf(L2FastWithdrawContract.address)
      console.log('after l2 ETH (L2FastWithdrawBalance): ', L2FastWithdrawBalance.toString())

      const saleCount = await L2FastWithdrawProxy.salecount()
      console.log('saleCount : ', saleCount);
      expect(saleCount).to.be.equal(1);
      let saleInformation = await L2FastWithdrawProxy.dealData(saleCount)
      console.log('saleInformation : ', saleInformation);
    })

    it("providerFW(ERC20) in L1", async () => {
      const saleCount = await L2FastWithdrawProxy.salecount()
      const providerTx = await L1FastWithdrawContract.connect(l1user1).provideFW(
        zeroAddr,
        l2Wallet.address,
        twoETH,
        saleCount,
        200000,
        {
          value: twoETH,
        }
      )
      await providerTx.wait()
      console.log('providerTx : ', providerTx.hash)
    
      await messenger.waitForMessageStatus(providerTx.hash, MessageStatus.RELAYED)
      console.log("send the Message L1 to L2");

      let l1Balance = await l1Wallet.getBalance()
      console.log('l1 ETH balance(Wallet): ', l1Balance.toString())
      let l2ETHBalance = await l2ETHERC20.balanceOf(l2Wallet.address)
      console.log('l2 ETH(ERC20) balance (l1Wallet): ', l2ETHBalance.toString())

      let l1BalanceUser1 = await l1user1.getBalance()
      console.log('l1 native balance (ETH) (User1): ', l1BalanceUser1.toString())
      let l2ETHBalanceUser1 = await l2ETHERC20.balanceOf(l2user1.address)
      console.log('l2 ETH(ERC20) balance (User1): ', l2ETHBalanceUser1.toString())

      L2FastWithdrawBalance = await l2ETHERC20.balanceOf(L2FastWithdrawContract.address)
      console.log('provider after L2 ERC20 (L2FastWithdrawBalance): ', L2FastWithdrawBalance.toString())

      let saleInformation = await L2FastWithdrawContract.dealData(saleCount)
      console.log("saleInformation : ", saleInformation)
    })
  })

});
