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
import { BytesLike, Event, utils } from 'ethers'

import { CrossChainMessenger, MessageStatus, NativeTokenBridgeAdapter, NumberLike } from '../src'
import L1FastWithdrawProxy_ABI from "../artifacts/contracts/L1/L1FastWithdrawProxy.sol/L1FastWithdrawProxy.json"
import L1FastWithdraw_ABI from "../artifacts/contracts/L1/L1FastWithdraw.sol/L1FastWithdraw.json"
import L2FastWithdrawProxy_ABI from "../artifacts/contracts/L2/L2FastWithdrawProxy.sol/L2FastWithdrawProxy.json"
import L2FastWithdraw_ABI from "../artifacts/contracts/L2/L2FastWithdraw.sol/L2FastWithdraw.json"
import L1StandardBridgeABI from '../contracts-bedrock/forge-artifacts/L1StandardBridge.sol/L1StandardBridge.json'
import OptimismMintableERC20TokenFactoryABI from '../contracts-bedrock/forge-artifacts/OptimismMintableERC20Factory.sol/OptimismMintableERC20Factory.json'
import OptimismMintableERC20TokenABI from '../contracts-bedrock/forge-artifacts/OptimismMintableERC20.sol/OptimismMintableERC20.json'
import MockERC20ABI from '../contracts-bedrock/forge-artifacts/MockERC20Token.sol/MockERC20Token.json'
import L2UsdcBridgeProxy_ABI from '../artifacts/contracts/L2/L2UsdcBridgeProxy.sol/L2UsdcBridgeProxy.json'
import L2UsdcBridge_ABI from '../artifacts/contracts/L2/L2UsdcBridge.sol/L2UsdcBridge.json'
import L1UsdcBridgeProxy_ABI from '../artifacts/contracts/L1/L1UsdcBridgeProxy.sol/L1UsdcBridgeProxy.json'
import L1UsdcBridge_ABI from '../artifacts/contracts/L1/L1UsdcBridge.sol/L1UsdcBridge.json'
import SignatureChecker_ABI from '../artifacts/contracts/mockUsdc/util/SignatureChecker.sol/SignatureChecker.json'
import Usdc_ABI from '../artifacts/contracts/mockUsdc/v2/FiatTokenV2_2.sol/FiatTokenV2_2.json'
import FiatTokenProxy_ABI from '../artifacts/contracts/mockUsdc/v1/FiatTokenProxy.sol/FiatTokenProxy.json'
import MasterMinter_ABI from '../artifacts/contracts/mockUsdc/minting/MasterMinter.sol/MasterMinter.json'


import dotenv from "dotenv" ;

dotenv.config();

describe("USDC FastWithdraw Test", function () {
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
  let L1SignatureCheckerContract : any;
  let L2SignatureCheckerContract : any;

  let L1fiatTokenV2_2 : any;
  let L2fiatTokenV2_2 : any;
  let L1fiatTokenProxy : any;
  let L2fiatTokenProxy : any;
  let L1fiatTokenContract : any;
  let L2fiatTokenContract : any;
  let L1MasterMinter : any;
  let L2MasterMinter : any;

  let L1UsdcBridge : any;
  let L2UsdcBridge : any;
  let L1UsdcBridgeProxy : any;
  let L2UsdcBridgeProxy : any;
  let L1UsdcBridgeContract : any;
  let L2UsdcBridgeContract : any;

  let beforeL1USDCBalanceUser : any;
  let beforeL2USDCBalanceUser : any;
  let beforeL1USDCBalanceWallet : any;
  let beforeL2USDCBalanceWallet : any;
  let afterL1USDCBalanceUser : any;
  let afterL2USDCBalanceUser : any;
  let afterL1USDCBalanceWallet : any;
  let afterL2USDCBalanceWallet : any;
  let beforeContractBalance : any;
  let afterContractBalance : any;



  const THROWAWAY_ADDRESS = "0x0000000000000000000000000000000000000001"

  let libraryName = "SignatureChecker"

  let tokenName = "USD Coin"
  let tokenSymbol = "USDC"
  let tokenCurrency = "USD"
  let tokenDecimals = 6

  let editTime = 180

  function link(bytecode : any, libraryName : any, libraryAddress : any) {
    const address = libraryAddress.replace('0x', '');
    console.log("address :", address);
    const encodedLibraryName = utils
        .solidityKeccak256(['string'], [libraryName])
        .slice(2, 36);
    console.log("encodedLibraryName :", encodedLibraryName);
    const pattern = new RegExp(`_+\\$${encodedLibraryName}\\$_+`, 'g');
    console.log("pattern :", pattern);
    if (!pattern.exec(bytecode)) {
        throw new Error(`Can't link '${libraryName}'.`);
    }
    return bytecode.replace(pattern, address);
  }

  function linkLibraries(
    {
      bytecode,
      linkReferences,
    }: {
      bytecode: string
      linkReferences: { [fileName: string]: { [contractName: string]: { length: number; start: number }[] } }
    },
    libraries: { [libraryName: string]: string }
  ): string {
    Object.keys(linkReferences).forEach((fileName) => {
      Object.keys(linkReferences[fileName]).forEach((contractName) => {
        if (!libraries.hasOwnProperty(contractName)) {
          throw new Error(`Missing link library name ${contractName}`)
        }
        const address = utils.getAddress(libraries[contractName]).toLowerCase().slice(2)
        linkReferences[fileName][contractName].forEach(({ start: byteStart, length: byteLength }) => {
          const start = 2 + byteStart * 2
          const length = byteLength * 2
          bytecode = bytecode
            .slice(0, start)
            .concat(address)
            .concat(bytecode.slice(start + length, bytecode.length))
        })
      })
    })
    return bytecode
  }

  function linkLibrary2(bytecode: string, libraries: {
    [name: string]: string
  } = {}): string {
    let linkedBytecode = bytecode
    for (const [name, address] of Object.entries(libraries)) {
      const placeholder = `__\$${utils.solidityKeccak256(['string'], [name]).slice(2, 36)}\$__`
      const formattedAddress = utils.getAddress(address).toLowerCase().replace('0x', '')
      if (linkedBytecode.indexOf(placeholder) === -1) {
        throw new Error(`Unable to find placeholder for library ${name}`)
      }
      while (linkedBytecode.indexOf(placeholder) !== -1) {
        linkedBytecode = linkedBytecode.replace(placeholder, formattedAddress)
      }
    }
    return linkedBytecode
  }
  
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
        l1Contracts.L1CrossDomainMessenger
      )).wait()

      const checkL1Inform = await L1FastWithdrawProxy.crossDomainMessenger()
      if(checkL1Inform !== l1Contracts.L1CrossDomainMessenger){
        console.log("===========L1FastWithdraw initialize ERROR!!===========")
      }
    })

    it("L1FastWithdraw set chainInfo", async () => {
      await (await L1FastWithdrawProxy.connect(l1Wallet).chainInfo(
        L2FastWithdrawContract.address,
        zeroAddr,
        l2NativeTokenContract.address,
        l2ChainId,
        editTime
      )).wait()
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


    it("deploy the L1SignatureCheckerContract", async () => {
      const L1SignatureCheckerContractDep = new ethers.ContractFactory(
        SignatureChecker_ABI.abi,
        SignatureChecker_ABI.bytecode,
        l1Wallet
      )

      L1SignatureCheckerContract = await L1SignatureCheckerContractDep.deploy()
      await L1SignatureCheckerContract.deployed()
    })

    it("deploy the L2SignatureCheckerContract", async () => {
      const L2SignatureCheckerContractDep = new ethers.ContractFactory(
        SignatureChecker_ABI.abi,
        SignatureChecker_ABI.bytecode,
        l2Wallet
      )

      L2SignatureCheckerContract = await L2SignatureCheckerContractDep.deploy()
      await L2SignatureCheckerContract.deployed()
    })

    it("deploy the L1fiatTokenV2_2", async () => {
      // console.log("L1SignatureCheckerContract.address :", L1SignatureCheckerContract.address)
      // let getByteCode = await link(Usdc_ABI.bytecode, libraryName.toString() , L1SignatureCheckerContract.address);
      // const L1fiatTokenV2_2Dep = await ethers.getContractFactory("FiatTokenV2_2",{
      //   libraries: {
      //     SignatureChecker: L1SignatureCheckerContract.address,
      //   }
      // })
      // let usdcBytecode = Usdc_ABI.bytecode
      // let usdcLinkReference = Usdc_ABI.linkReferences
      // let getByteCode2 = await linkLibraries({Usdc_ABI.bytecode, Usdc_ABI.linkReferences}, libraryName.toString())
      let getByteCode3 = await linkLibrary2(Usdc_ABI.bytecode, {
        [`contracts/mockUsdc/util/SignatureChecker.sol:SignatureChecker`]: L1SignatureCheckerContract.address,
      })

      const L1fiatTokenV2_2Dep = new ethers.ContractFactory(
        Usdc_ABI.abi,
        getByteCode3,
        l1Wallet
      )

      L1fiatTokenV2_2 = await L1fiatTokenV2_2Dep.deploy()
      await L1fiatTokenV2_2.deployed()
    })

    it("deploy the L2fiatTokenV2_2", async () => {
      // const L2fiatTokenV2_2Dep = await ethers.getContractFactory("FiatTokenV2_2",{
      //   signer: l2Wallet,
      //   libraries: {
      //     SignatureChecker: L2SignatureCheckerContract.address,
      //   }
      // })

      let getByteCode = await linkLibrary2(Usdc_ABI.bytecode, {
        [`contracts/mockUsdc/util/SignatureChecker.sol:SignatureChecker`]: L2SignatureCheckerContract.address,
      })


      const L2fiatTokenV2_2Dep = new ethers.ContractFactory(
        Usdc_ABI.abi,
        getByteCode,
        l2Wallet
      )
      
      L2fiatTokenV2_2 = await L2fiatTokenV2_2Dep.deploy()
      await L2fiatTokenV2_2.deployed()
    })

    it("L1fiatTokenV2_2 initialize", async () => {
      // let tx = await L1fiatTokenV2_2.initialize(
      //     "",
      //     "",
      //     "",
      //     0,
      //     THROWAWAY_ADDRESS,
      //     THROWAWAY_ADDRESS,
      //     THROWAWAY_ADDRESS,
      //     THROWAWAY_ADDRESS,
      // )
      // await tx.wait()
      // // console.log("initialize tx hash:", tx.hash)
      
      // tx = await L1fiatTokenV2_2.initializeV2("")
      // await tx.wait()
      // // console.log("initializeV2 tx hash:", tx.hash)
      
      // tx = await L1fiatTokenV2_2.initializeV2_1(THROWAWAY_ADDRESS)
      // await tx.wait()
      // // console.log("initializeV2_1 tx hash:", tx.hash)
      
      // tx = await L1fiatTokenV2_2.initializeV2_2([], "")
      // await tx.wait()
      // // console.log("initialize L1V2_2 tx hash:", tx.hash)

      let tx = await L1fiatTokenV2_2.connect(l1Wallet).initialize(
        tokenName,
        tokenSymbol,
        tokenCurrency,
        tokenDecimals,
        l2Wallet.address,
        l1Wallet.address,
        l1Wallet.address,
        l1Wallet.address
      )  
      await tx.wait();

      tx = await L1fiatTokenV2_2.connect(l1Wallet).initializeV2(tokenName)
      await tx.wait();
      tx = await L1fiatTokenV2_2.connect(l1Wallet).initializeV2_1(l1Wallet.address)
      await tx.wait();
      tx = await L1fiatTokenV2_2.connect(l1Wallet).initializeV2_2([], tokenSymbol)
      await tx.wait();
    })

    it("L2fiatTokenV2_2 initialize", async () => {
      // let tx = await L2fiatTokenV2_2.initialize(
      //     "",
      //     "",
      //     "",
      //     0,
      //     THROWAWAY_ADDRESS,
      //     THROWAWAY_ADDRESS,
      //     THROWAWAY_ADDRESS,
      //     THROWAWAY_ADDRESS,
      // )
      // await tx.wait()
      // // console.log("initialize tx hash:", tx.hash)
      
      // tx = await L2fiatTokenV2_2.initializeV2("")
      // await tx.wait()
      // // console.log("initializeV2 tx hash:", tx.hash)
      
      // tx = await L2fiatTokenV2_2.initializeV2_1(THROWAWAY_ADDRESS)
      // await tx.wait()
      // // console.log("initializeV2_1 tx hash:", tx.hash)
      
      // tx = await L2fiatTokenV2_2.initializeV2_2([], "")
      // await tx.wait()
      // // console.log("initialize L2V2_2 tx hash:", tx.hash)

      let tx = await L2fiatTokenV2_2.initialize(
        tokenName,
        tokenSymbol,
        tokenCurrency,
        tokenDecimals,
        l2Wallet.address,
        l2Wallet.address,
        l2Wallet.address,
        l2Wallet.address
      )
      await tx.wait();

      tx = await L2fiatTokenV2_2.initializeV2(tokenName)
      await tx.wait();
      tx = await L2fiatTokenV2_2.initializeV2_1(l2Wallet.address)
      await tx.wait();
      tx = await L2fiatTokenV2_2.initializeV2_2([], tokenSymbol)
      await tx.wait();
    })

    it("configureMinter L1", async () => {
      let tx = await L1fiatTokenV2_2.configureMinter(
        l1Wallet.address,
        hundETH
      )
      await tx.wait()
    })

    it("mint L1 wallet", async () => {
      let beforeUsdcBalance = await L1fiatTokenV2_2.balanceOf(l1user1.address)
      expect(beforeUsdcBalance).to.be.equal(0)
      let tx = await L1fiatTokenV2_2.mint(
        l1user1.address,
        tenETH
      )
      await tx.wait()
      let afterUsdcBalance = await L1fiatTokenV2_2.balanceOf(l1user1.address)
      expect(afterUsdcBalance).to.be.equal(tenETH)
    })

    it("configureMinter L2", async () => {
      let tx = await L2fiatTokenV2_2.configureMinter(
        l2Wallet.address,
        hundETH
      )
      await tx.wait()
    })

    it("mint L2 wallet", async () => {
      let beforeUsdcBalance = await L2fiatTokenV2_2.balanceOf(l2Wallet.address)
      expect(beforeUsdcBalance).to.be.equal(0)
      let tx = await L2fiatTokenV2_2.mint(
        l2Wallet.address,
        tenETH
      )
      await tx.wait()
      let afterUsdcBalance = await L2fiatTokenV2_2.balanceOf(l2Wallet.address)
      expect(afterUsdcBalance).to.be.equal(tenETH)
    })

    it("Deploy the L1UsdcBridge", async () => {
      const L1UsdcBridgeDep = new ethers.ContractFactory(
        L1UsdcBridge_ABI.abi,
        L1UsdcBridge_ABI.bytecode,
        l1Wallet
      )

      L1UsdcBridge = await L1UsdcBridgeDep.deploy()
      await L1UsdcBridge.deployed()
    })

    it("Deploy the L2UsdcBridge", async () => {
      const L2UsdcBridgeDep = new ethers.ContractFactory(
        L2UsdcBridge_ABI.abi,
        L2UsdcBridge_ABI.bytecode,
        l2Wallet
      )

      L2UsdcBridge = await L2UsdcBridgeDep.deploy()
      await L2UsdcBridge.deployed()
    })

    it("Deploy the L1UsdcBridgeProxy", async () => {
      const L1UsdcBridgeProxyDep = new ethers.ContractFactory(
        L1UsdcBridgeProxy_ABI.abi,
        L1UsdcBridgeProxy_ABI.bytecode,
        l1Wallet
      )

      L1UsdcBridgeProxy = await L1UsdcBridgeProxyDep.deploy(
        L1UsdcBridge.address,
        l1Wallet.address,
        '0x'
      )
      await L1UsdcBridgeProxy.deployed()
    })

    it("Deploy the L2UsdcBridgeProxy", async () => {
      const L2UsdcBridgeProxyDep = new ethers.ContractFactory(
        L2UsdcBridgeProxy_ABI.abi,
        L2UsdcBridgeProxy_ABI.bytecode,
        l2Wallet
      )

      L2UsdcBridgeProxy = await L2UsdcBridgeProxyDep.deploy(
        L2UsdcBridge.address,
        l2Wallet.address,
        '0x'
      )
      await L2UsdcBridgeProxy.deployed()
    })

    it("set L1UsdcBridgeContract", async () => {
      L1UsdcBridgeContract = new ethers.Contract(
        L1UsdcBridgeProxy.address,
        L1UsdcBridge_ABI.abi,
        l1Wallet
      )
    })

    it("set L2UsdcBridgeContract", async () => {
      L2UsdcBridgeContract = new ethers.Contract(
        L2UsdcBridgeProxy.address,
        L2UsdcBridge_ABI.abi,
        l2Wallet
      )
    })


    // it("Deploy the L1FiatTokenProxy", async () => {
    //   const L1fiatTokenProxyDep = new ethers.ContractFactory(
    //     FiatTokenProxy_ABI.abi,
    //     FiatTokenProxy_ABI.bytecode,
    //     l1Wallet
    //   )

    //   L1fiatTokenProxy = await L1fiatTokenProxyDep.deploy(L1fiatTokenV2_2.address)
    //   await L1fiatTokenProxy.deployed()
    // })

    // it("Deploy the L2FiatTokenProxy", async () => {
    //   const L2fiatTokenProxyDep = new ethers.ContractFactory(
    //     FiatTokenProxy_ABI.abi,
    //     FiatTokenProxy_ABI.bytecode,
    //     l2Wallet
    //   )

    //   L2fiatTokenProxy = await L2fiatTokenProxyDep.deploy(L2fiatTokenV2_2.address)
    //   await L2fiatTokenProxy.deployed()
    // })

    // it("Deploy the L1MasterMinter", async () => {
    //   const L1MasterMinterDep = new ethers.ContractFactory(
    //     MasterMinter_ABI.abi,
    //     MasterMinter_ABI.bytecode,
    //     l1Wallet
    //   )

    //   L1MasterMinter = await L1MasterMinterDep.deploy(L1fiatTokenProxy.address)
    //   await L1MasterMinter.deployed()
    //   await L1MasterMinter.transferOwnership(l1Wallet.address)
    // })

    // it("Deploy the L2MasterMinter", async () => {
    //   const L2MasterMinterDep = new ethers.ContractFactory(
    //     MasterMinter_ABI.abi,
    //     MasterMinter_ABI.bytecode,
    //     l2Wallet
    //   )

    //   L2MasterMinter = await L2MasterMinterDep.deploy(L2fiatTokenProxy.address)
    //   await L2MasterMinter.deployed()
    //   await L2MasterMinter.transferOwnership(l2Wallet.address)
    // })

    // it("L1FiatTokenProxy changeAdmin", async () => {
    //   let tx = await L1fiatTokenProxy.changeAdmin(l1Wallet.address)
    //   await tx.wait()
    // })

    // it("L2FiatTokenProxy changeAdmin", async () => {
    //   let tx = await L2fiatTokenProxy.changeAdmin(l2Wallet.address)
    //   await tx.wait()
    // })

    // it("set L1fiatTokenContract", async () => {
    //   L1fiatTokenContract = new ethers.Contract(
    //     L1fiatTokenProxy.address,
    //     Usdc_ABI.abi,
    //     l1Wallet
    //   )
    // })

    // it("set L2fiatTokenContract", async () => {
    //   L2fiatTokenContract = new ethers.Contract(
    //     L2fiatTokenProxy.address,
    //     Usdc_ABI.abi,
    //     l2Wallet
    //   )
    // })


    // it("L1fiatTokenContract initialize", async () => {
    //   // let admincheck = await L1fiatTokenProxy.admin()
    //   // console.log(L1fiatTokenContract)
    //   // console.log("admincheck :", admincheck)
    //   // console.log("l1Wallet.address :", l1Wallet.address)
    //   let tx = await L1fiatTokenContract.connect(l1Wallet).initialize(
    //     tokenName,
    //     tokenSymbol,
    //     tokenCurrency,
    //     tokenDecimals,
    //     L1MasterMinter.address,
    //     l1Wallet.address,
    //     l1Wallet.address,
    //     l1Wallet.address
    //   )  
    //   await tx.wait();

    //   tx = await L1fiatTokenContract.connect(l1Wallet).initializeV2(tokenName)
    //   await tx.wait();
    //   tx = await L1fiatTokenContract.connect(l1Wallet).initializeV2_1(l1Wallet.address)
    //   await tx.wait();
    //   tx = await L1fiatTokenContract.connect(l1Wallet).initializeV2_2([], tokenSymbol)
    //   await tx.wait();
    // })

    // it("L2fiatTokenContract initialize", async () => {
    //   // let admincheck = await L2fiatTokenProxy.admin()
    //   // console.log("admincheck :", admincheck)
    //   // console.log("l1Wallet.address :", l2Wallet.address)
    //   let tx = await L2fiatTokenContract.initialize(
    //     tokenName,
    //     tokenSymbol,
    //     tokenCurrency,
    //     tokenDecimals,
    //     L2MasterMinter.address,
    //     l2Wallet.address,
    //     l2Wallet.address,
    //     l2Wallet.address
    //   )
    //   await tx.wait();

    //   tx = await L2fiatTokenContract.initializeV2(tokenName)
    //   await tx.wait();
    //   tx = await L2fiatTokenContract.initializeV2_1(l2Wallet.address)
    //   await tx.wait();
    //   tx = await L2fiatTokenContract.initializeV2_2([], tokenSymbol)
    //   await tx.wait();
    // })

  });

  describe("FW USDC Test", () => {
    it("requestFW (USDC) in L2", async () => {
      beforeL2USDCBalanceWallet = await L2fiatTokenV2_2.balanceOf(l2Wallet.address)
      beforeContractBalance = await L2fiatTokenV2_2.balanceOf(L2FastWithdrawContract.address)

      let tx = await L2fiatTokenV2_2.connect(l2Wallet).approve(L2FastWithdrawContract.address, threeETH)
      await tx.wait()

      let saleCount = await L2FastWithdrawProxy.saleCount()
      expect(saleCount).to.be.equal(0)

      await (await L2FastWithdrawContract.connect(l2Wallet).requestFW(
        L1fiatTokenV2_2.address,
        L2fiatTokenV2_2.address,
        threeETH,
        twoETH,
        l1ChainId
      )).wait()

      afterL2USDCBalanceWallet = await L2fiatTokenV2_2.balanceOf(l2Wallet.address)
      afterContractBalance = await L2fiatTokenV2_2.balanceOf(L2FastWithdrawContract.address)

      expect(beforeL2USDCBalanceWallet).to.be.gt(afterL2USDCBalanceWallet)
      expect(afterContractBalance).to.be.gt(beforeContractBalance)
      
      saleCount = await L2FastWithdrawProxy.saleCount()
      expect(saleCount).to.be.equal(1);
      
      let saleInformation = await L2FastWithdrawProxy.dealData(saleCount)
      if(saleInformation.requester !== l2Wallet.address) {
        console.log("===========requestFW Fail!!===========")
      } 
    })

    it("providerFW(USDC) in L1", async () => {
      beforeL1USDCBalanceWallet = await L1fiatTokenV2_2.balanceOf(l1Wallet.address)
      beforeL1USDCBalanceUser = await L1fiatTokenV2_2.balanceOf(l2user1.address)

      beforeL2USDCBalanceUser = await L2fiatTokenV2_2.balanceOf(l2user1.address)
      beforeContractBalance = await L2fiatTokenV2_2.balanceOf(L2FastWithdrawContract.address)

      const providerApproveTx = await L1fiatTokenV2_2.connect(l1user1).approve(L1FastWithdrawContract.address, twoETH)
      await providerApproveTx.wait()

      const saleCount = await L2FastWithdrawProxy.saleCount()

      let beforesaleInformation = await L2FastWithdrawContract.dealData(saleCount)
      // let l1tokenAddrcheck = await L2FastWithdrawContract.msgSender();
      // console.log("before l1tokenAddrcheck", l1tokenAddrcheck);

      const providerTx = await L1FastWithdrawContract.connect(l1user1).provideFW(
        L1fiatTokenV2_2.address,
        L2fiatTokenV2_2.address,
        l2Wallet.address,
        threeETH,
        twoETH,
        saleCount,
        l2ChainId,
        200000,
        beforesaleInformation.hashValue
      )
      await providerTx.wait()

      await messenger.waitForMessageStatus(providerTx.hash, MessageStatus.RELAYED)

      // l1tokenAddrcheck = await L2FastWithdrawContract.msgSender();
      // console.log("after l1tokenAddrcheck", l1tokenAddrcheck);

      afterL1USDCBalanceWallet = await L1fiatTokenV2_2.balanceOf(l1Wallet.address)
      afterL1USDCBalanceUser = await L1fiatTokenV2_2.balanceOf(l2user1.address)

      afterL2USDCBalanceUser = await L2fiatTokenV2_2.balanceOf(l2user1.address)
      afterContractBalance = await L2fiatTokenV2_2.balanceOf(L2FastWithdrawContract.address)

      let saleInformation = await L2FastWithdrawContract.dealData(saleCount)

      expect(afterL1USDCBalanceWallet).to.be.gt(beforeL1USDCBalanceWallet)
      expect(beforeL1USDCBalanceUser).to.be.gt(afterL1USDCBalanceUser)
      expect(afterL2USDCBalanceUser).to.be.gt(beforeL2USDCBalanceUser)
      expect(beforeContractBalance).to.be.gt(afterContractBalance)
      if (beforesaleInformation.provider === saleInformation.provider) {
        console.log("===== ERROR_01 =====")
      } 
      if (saleInformation.provider !== l1user1.address ) {
        console.log("===== ERROR_02 =====")
      }
    })
  })

});
