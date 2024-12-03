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

import { CrossChainMessenger, MessageStatus, NativeTokenBridgeAdapter, NumberLike } from '../../src'
import L1CrossTradeProxy_ABI from "../../artifacts/contracts/L1/L1CrossTradeProxy.sol/L1CrossTradeProxy.json"
import L1CrossTrade_ABI from "../../artifacts/contracts/L1/L1CrossTrade.sol/L1CrossTrade.json"
import L2CrossTradeProxy_ABI from "../../artifacts/contracts/L2/L2CrossTradeProxy.sol/L2CrossTradeProxy.json"
import L2CrossTrade_ABI from "../../artifacts/contracts/L2/L2CrossTrade.sol/L2CrossTrade.json"
import L1StandardBridgeABI from '../../contracts-bedrock/forge-artifacts/L1StandardBridge.sol/L1StandardBridge.json'
import OptimismMintableERC20TokenFactoryABI from '../../contracts-bedrock/forge-artifacts/OptimismMintableERC20Factory.sol/OptimismMintableERC20Factory.json'
import OptimismMintableERC20TokenABI from '../../contracts-bedrock/forge-artifacts/OptimismMintableERC20.sol/OptimismMintableERC20.json'
import MockERC20ABI from '../../contracts-bedrock/forge-artifacts/MockERC20Token.sol/MockERC20Token.json'
import MockTON_ABI from "../../artifacts/contracts/Mock/MockTON.sol/MockTON.json"
import MockERC20_ABI from "../../artifacts/contracts/MockERC20Token.sol/MockERC20Token.json"
import L2StandardERC20_ABI from "../../artifacts/contracts/Mock/L2StandardERC20.sol/L2StandardERC20.json"


import dotenv from "dotenv" ;

dotenv.config();

describe("ERC20 CrossTrade Optimism", function () {
  let network = "devnetL1"
  let deployedAddress = require('../data/deployed.'+network+'.json');
  let predeployedAddress = require('../data/predeployed.'+network+'.json');

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

  // let L1CrossTradeLogicDep : any;
  let L1CrossTradeLogic : any;
  let L1CrossTradeProxy : any;
  let L1CrossTradeContract : any;

  // let L2CrossTradeProxyDep : any;
  let L2CrossTradeLogic : any;
  let L2CrossTradeProxy : any;
  let L2CrossTradeContract : any;
  
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
  let L2CrossTradeBalance : any;

  let mockTON : any;
  let l2mockTON : any;
  let l2mockTONAddr : any;
  let erc20Token : any;
  let OptimismMintableERC20TokenFactory : any;

  let l2erc20Token : any;
  let l2erc20Addr : any;

  let editTime = 180
  
  before('create fixture loader', async () => {
    // [deployer] = await ethers.getSigners();

    l1ChainId = (await l1Provider.getNetwork()).chainId
    l2ChainId = (await l2Provider.getNetwork()).chainId
    // if (l2NativeToken === '') {
    //   l2NativeToken = deployedAddress.L2NativeToken
    // }
  
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
    it("ETH check and depositETH", async () => {
      let l1Balance = await l1Wallet.getBalance()
      console.log('l1 native balance: (ETH) (Wallet)', l1Balance.toString())
      let l2Balance = await l2Wallet.getBalance()
      console.log('l2 native balance: (ETH) (Wallet)', l2Balance.toString())

      if (Number(l2Balance.toString()) < Number(tenETH)) {
        // console.log('start faucet')
        const ethDeposit = await messenger.depositETH(tenETH, { recipient: l2Wallet.address })
        const depositMessageReceipt = await messenger.waitForMessageReceipt(
          ethDeposit
        )
        if (depositMessageReceipt.receiptStatus !== 1) {
          throw new Error('deposit failed')
        }
        console.log(
          `Deposit complete - ${depositMessageReceipt.transactionReceipt.transactionHash}`
        )
      }

      l1Balance = await l1user1.getBalance()
      console.log('l1 native balance: (ETH) (user1)', l1Balance.toString())
      l2Balance = await l2user1.getBalance()
      console.log('l2 native balance: (ETH) (user1)', l2Balance.toString())

      if (Number(l2Balance.toString()) < Number(tenETH)) {
        // console.log('start faucet')
        const ethDeposit = await messenger.depositETH(tenETH, { recipient: l2user1.address })
        const depositMessageReceipt = await messenger.waitForMessageReceipt(
          ethDeposit
        )
        if (depositMessageReceipt.receiptStatus !== 1) {
          throw new Error('deposit failed')
        }
        console.log(
          `Deposit complete - ${depositMessageReceipt.transactionReceipt.transactionHash}`
        )
      }

    })

    it("deploy MockTON", async () => {
      const mockTONDep = new ethers.ContractFactory(
        MockTON_ABI.abi,
        MockTON_ABI.bytecode,
        l1Wallet
      )

      mockTON = await mockTONDep.deploy()
      await mockTON.deployed()
      console.log("Deploy TON complete")
    })

    it("deploy MockERC20", async () => {
      const erc20TokenDep = new ethers.ContractFactory(
          MockERC20_ABI.abi,
          MockERC20_ABI.bytecode,
          l1Wallet
      )

      erc20Token = await erc20TokenDep.deploy(
        "ERC20",
        "Test"
      )
      await erc20Token.deployed()

      await erc20Token.connect(l1Wallet).mint(
        l1Wallet.address,
        hundETH
      )

      // let tx = await erc20Token.balanceOf(
      //   l1Wallet.address
      // )
      // console.log('ERC20 balance in L1(Wallet):', Number(tx.toString()))
      
      // tx = await erc20Token.balanceOf(
      //   l1user1.address
      // )
      // console.log('ERC20 balance in L1(user1):', Number(tx.toString()))

      // let l1Balance = await l1Wallet.getBalance()
      // console.log('l1 native balance: (ETH) (Wallet)', l1Balance.toString())
      // let l2Balance = await l2Wallet.getBalance()
      // console.log('l2 native balance: (ETH) (Wallet)', l2Balance.toString())

      // l1Balance = await l1user1.getBalance()
      // console.log('l1 native balance: (ETH) (user1)', l1Balance.toString())
      // l2Balance = await l2user1.getBalance()
      // console.log('l2 native balance: (ETH) (user1)', l2Balance.toString())
    })
    
    it("L1CrossTradeLogic", async () => {
      const L1CrossTradeLogicDep = new ethers.ContractFactory(
        L1CrossTrade_ABI.abi,
        L1CrossTrade_ABI.bytecode,
        l1Wallet
      )

      L1CrossTradeLogic = await L1CrossTradeLogicDep.deploy()
      await L1CrossTradeLogic.deployed()

      // console.log("L1FasitWithdrawLogic :", L1CrossTradeLogic.address);
    })

    it("L1CrossTradeProxy", async () => {
      const L1CrossTradeProxyDep = new ethers.ContractFactory(
        L1CrossTradeProxy_ABI.abi,
        L1CrossTradeProxy_ABI.bytecode,
        l1Wallet
      )

      L1CrossTradeProxy = await L1CrossTradeProxyDep.deploy()
      await L1CrossTradeProxy.deployed()
      // console.log("L1CrossTradeProxy :", L1CrossTradeProxy.address);
    })

    it("L1CrossTradeProxy upgradeTo", async () => {
      await (await L1CrossTradeProxy.upgradeTo(L1CrossTradeLogic.address)).wait();
      let imp2 = await L1CrossTradeProxy.implementation()
      if(L1CrossTradeLogic.address !== imp2) {
        console.log("===========L1CrossTradeProxy upgradeTo ERROR!!===========")
      }
    })

    it("set L1CrossTrade", async () => {
      L1CrossTradeContract = new ethers.Contract(
        L1CrossTradeProxy.address,
        L1CrossTrade_ABI.abi,
        l1Wallet
      )
    })

    it("L2CrossTradeLogic", async () => {
      const L2CrossTradeLogicDep = new ethers.ContractFactory(
        L2CrossTrade_ABI.abi,
        L2CrossTrade_ABI.bytecode,
        l2Wallet
      )

      L2CrossTradeLogic = await L2CrossTradeLogicDep.deploy()
      await L2CrossTradeLogic.deployed()

      // console.log("L2FasitWithdrawLogic :", L2CrossTradeLogic.address);
    })

    it("L2CrossTradeProxy", async () => {
      const L2CrossTradeProxyDep = new ethers.ContractFactory(
        L2CrossTradeProxy_ABI.abi,
        L2CrossTradeProxy_ABI.bytecode,
        l2Wallet
      )

      L2CrossTradeProxy = await L2CrossTradeProxyDep.deploy()
      await L2CrossTradeProxy.deployed()
      // console.log("L2CrossTradeProxy :", L2CrossTradeProxy.address);
    })

    it("L2CrossTradeProxy upgradeTo", async () => {
      await (await L2CrossTradeProxy.upgradeTo(L2CrossTradeLogic.address)).wait();
      let imp2 = await L2CrossTradeProxy.implementation()
      if(L2CrossTradeLogic.address !== imp2) {
        console.log("===========L2CrossTradeProxy upgradeTo ERROR!!===========")
      }
    })

    it("set L2CrossTrade", async () => {
      L2CrossTradeContract = new ethers.Contract(
        L2CrossTradeProxy.address,
        L2CrossTrade_ABI.abi,
        l2Wallet
      )
    })

    it("L1CrossTrade setChainInfo", async () => {
      await (await L1CrossTradeProxy.connect(l1Wallet).setChainInfo(
        l1Contracts.L1CrossDomainMessenger,
        L2CrossTradeContract.address,
        zeroAddr,
        mockTON.address,
        l2ChainId
      )).wait()

      let tx = await L1CrossTradeProxy.chainData(l2ChainId)
      // console.log("tx :", tx);

      if(tx.crossDomainMessenger !== l1Contracts.L1CrossDomainMessenger){
        console.log("===========L1CrossTrade chainInfo ERROR!!===========")
      }
      if(tx.l2CrossTradeContract !== L2CrossTradeContract.address){
        console.log("===========L1CrossTrade chainInfo ERROR!!===========")
      }
      if(tx.legacyERC20ETH !== zeroAddr){
        console.log("===========L1CrossTrade chainInfo ERROR!!===========")
      }
      if(tx.l1TON !== mockTON.address){
        console.log("===========L1CrossTrade chainInfo ERROR!!===========")
      }
    })

    it("L2CrossTrade initialize", async () => {
      await (await L2CrossTradeProxy.connect(l2Wallet).initialize(
        l2CrossDomainMessengerAddr,
        zeroAddr
      )).wait();
    
      const checkL2Inform = await L2CrossTradeProxy.crossDomainMessenger()
      if(checkL2Inform !== l2CrossDomainMessengerAddr){
        console.log("===========L2CrossTrade initialize ERROR!!===========")
      }
      let tx = await L2CrossTradeContract.saleCount()
      expect(tx).to.be.equal(0)
      tx = await L2CrossTradeContract.legacyERC20ETH()
      if(tx !== zeroAddr){
        console.log("===========L2CrossTrade initialize ERROR!!===========")
      }
      // tx = await L2CrossTradeContract.nativeL1token()
      // if(tx !== l2NativeTokenContract.address){
      //   console.log("===========L2CrossTrade initialize ERROR!!===========")
      // }
    })

    it("L2CrossTrade setChainInfo", async () => {
      await (await L2CrossTradeProxy.connect(l2Wallet).setChainInfo(
        L1CrossTradeContract.address,
        mockTON.address,
        l1ChainId
      )).wait()

      // console.log("l1ChainId : ", l1ChainId)

      let tx = await L2CrossTradeProxy.chainData(l1ChainId)
      // console.log("tx : ", tx)
      // console.log("L1CrossTradeContract.address : ", L1CrossTradeContract.address)
      if(tx.l1CrossTradeContract !== L1CrossTradeContract.address){
        console.log("===========L2CrossTrade chainInfo ERROR!!===========")
      }
      if(tx.l1TON !== mockTON.address){
        console.log("===========L2CrossTrade chainInfo ERROR!!===========")
      }
    })

    // it("deploy MockERC20 in L1", async () => {
    //   const DeployMockERC20 = new ethers.ContractFactory(
    //     MockERC20ABI.abi,
    //     MockERC20ABI.bytecode,
    //     l1Wallet
    //   )

    //   MockERC20 = await DeployMockERC20.deploy(name,symbol)
    //   await MockERC20.deployed()
    //   await MockERC20.mint(l1Wallet.address, tenETH)
    //   await MockERC20.mint(l1user1.address, tenETH)
    // })

    // it("deploy MockERC20 in L2", async () => {
    //   const factory_OptimismMintable = new ethers.Contract(
    //     predeployedAddress.OptimismMintableERC20Factory,
    //     OptimismMintableERC20TokenFactoryABI.abi,
    //     l2Wallet
    //   )

    //   let tx = await factory_OptimismMintable.createOptimismMintableERC20(
    //     MockERC20.address,
    //     l2name,
    //     l2symbol
    //   )
    //   await tx.wait()

    //   const receipt = await tx.wait()
    //   const event = receipt.events.find(
    //     (e: Event) => e.event === 'OptimismMintableERC20Created'
    //   )
    
    //   if (!event) {
    //     throw new Error('Unable to find OptimismMintableERC20Created event')
    //   }

    //   l2MockERC20 = new ethers.Contract(
    //     event.args.localToken,
    //     OptimismMintableERC20TokenABI.abi,
    //     l2Wallet
    //   )
    // })

    it("Set L1StandrardBridgeContract", async () => {
      L1StandardBridgeContract = new ethers.Contract(
        l1Contracts.L1StandardBridge,
        L1StandardBridgeABI.abi,
        l1Wallet
      )
    })

    it("set the OptimismMintableERC20Factory", async () => {
      OptimismMintableERC20TokenFactory = new ethers.Contract(
        predeployedAddress.OptimismMintableERC20Factory,
        OptimismMintableERC20TokenFactoryABI.abi,
        l2Wallet
      )
      // console.log(OptimismMintableERC20TokenFactory)
    })
  });

  describe("Prepare CrossTrade Test", () => {
    it("ERC20 mint", async () => {
      let ERC20Balance = await erc20Token.balanceOf(
        l1Wallet.address
      )

      if (Number(ERC20Balance.toString()) < Number(hundETH)) {
        const tx = await erc20Token.connect(l1Wallet).mint(
          l1Wallet.address,
          hundETH
        )
        await tx.wait()
      }
    })

    it("createOptimismMintableERC20 in L2", async () => {
      let name = await erc20Token.name()
      let symbol = await erc20Token.symbol()

      const tx = await OptimismMintableERC20TokenFactory.connect(l2Wallet).createOptimismMintableERC20(
        erc20Token.address,
        name,
        symbol
      )

      const receipt = await tx.wait()
      const event = receipt.events.find(
        (e: Event) => e.event === 'StandardL2TokenCreated'
      )
      // console.log(event)
    
      if (!event) {
        throw new Error('Unable to find StandardL2TokenCreated event')
      }
      // console.log("mockTON.address :", mockTON.address);
      l2erc20Addr = event.args.localToken
      // console.log(`Deployed to ${l2mockTONAddr}`)
    })

    it("set l2ERC20Token", async () => {
      l2erc20Token = new ethers.Contract(
        l2erc20Addr,
        L2StandardERC20_ABI.abi,
        l2Wallet
      )
    })

    it("Deposit to L2 ERC20Token", async () => {
      const approvalTx = await messenger.approveERC20(
        erc20Token.address,
        l2erc20Token.address,
        tenETH
      )
      await approvalTx.wait()

      const depositTx = await messenger.depositERC20(
        erc20Token.address,
        l2erc20Token.address,
        tenETH
      )
      await depositTx.wait()

      const messageReceipt = await messenger.waitForMessageReceipt(depositTx)
      if (messageReceipt.receiptStatus !== 1) {
        throw new Error('deposit failed')
      }

      let l2ERC20balance = await l2erc20Token.balanceOf(l2Wallet.address)
      console.log("l2ERC20balance :", Number(l2ERC20balance))
    })

  })

  describe("CrossTrade ERC20 Test", () => {
    describe("registerToken & requestRegisteredToken Test", () => {
      it("registerToken can't use common user", async () => {
        await expect(L2CrossTradeContract.connect(l2user1).registerToken(
          erc20Token.address,
          l2erc20Token.address,
          l1ChainId
        )).to.be.rejectedWith("Accessible: Caller is not an admin")
      })

      it("registerToken can only Owner", async () => {          
        await (await L2CrossTradeContract.connect(l2Wallet).registerToken(
          erc20Token.address,
          l2erc20Token.address,
          l1ChainId
        )).wait();
  
        let check = await L2CrossTradeContract.registerCheck(
          l1ChainId,
          erc20Token.address,
          l2erc20Token.address
        )
        // console.log("l1tokenAddr :", l1tokenAddr)
        // console.log("l2NativeToken :", l2NativeToken)
  
        if (check !== true) {
          console.log("enteringToken fault data")
        }
      })

      it("The same value cannot be registerToken twice.", async () => {
        await expect(L2CrossTradeContract.connect(l2Wallet).registerToken(
          erc20Token.address,
          l2erc20Token.address,
          l1ChainId
        )).to.be.rejectedWith("already registerToken")
      })

      it("requestRegisteredToken(Request ERC20) in L2", async () => {
        let beforel2Balance = await l2erc20Token.balanceOf(l2Wallet.address)
        let beforeL2CrossTradeBalance = await l2erc20Token.balanceOf(L2CrossTradeContract.address)
        
        const providerApproveTx = await l2erc20Token.connect(l2Wallet).approve(L2CrossTradeContract.address, threeETH)
        await providerApproveTx.wait()
        
        await (await L2CrossTradeContract.connect(l2Wallet).requestRegisteredToken(
          erc20Token.address,
          l2erc20Token.address,
          threeETH,
          twoETH,
          l1ChainId
        )).wait()

        let afterl2Balance = await l2erc20Token.balanceOf(l2Wallet.address)
        let afterL2CrossTradeBalance = await l2erc20Token.balanceOf(L2CrossTradeContract.address)
  
        const saleCount = await L2CrossTradeProxy.saleCount()
        expect(saleCount).to.be.equal(1);
  
        expect(beforel2Balance).to.be.gt(afterl2Balance)
        expect(afterL2CrossTradeBalance).to.be.gt(beforeL2CrossTradeBalance)
      })

      it("faucet ERC20 to user1 in L1", async () => {
        let erc20TokenBalance = await erc20Token.balanceOf(
          l1user1.address
        )
  
        if (Number(erc20TokenBalance.toString()) < Number(twoETH)) {
          const tx = await erc20Token.connect(l1Wallet).mint(
            l1user1.address,
            twoETH
          )
          await tx.wait()
        }
      })

      it("providerCT(ERC20) in L1", async () => {
        let beforel2Balance = await l2erc20Token.balanceOf(l2Wallet.address)
        let beforel2BalanceUser1 = await l2erc20Token.balanceOf(l2user1.address)
  
        let beforel2NativeTokenBalance = await erc20Token.balanceOf(
          l1user1.address
        )
        // console.log("beforel2NativeTokenBalance(Provider) : ", beforel2NativeTokenBalance.toString())
        let beforel2NativeTokenBalanceWallet = await erc20Token.balanceOf(
          l1Wallet.address
        )
        // console.log("beforel2NativeTokenBalanceWallet(Requester) : ", beforel2NativeTokenBalanceWallet.toString())
      
        const providerApproveTx = await erc20Token.connect(l1user1).approve(L1CrossTradeContract.address, twoETH)
        await providerApproveTx.wait()
      
        const saleCount = await L2CrossTradeProxy.saleCount()
  
        let beforeL2CrossTradeBalance = await l2erc20Token.balanceOf(L2CrossTradeContract.address)
  
        let saleInformation = await L2CrossTradeContract.dealData(saleCount)
        // console.log("1")
  
        const providerTx = await L1CrossTradeContract.connect(l1user1).provideCT(
          erc20Token.address,
          l2erc20Token.address,
          l2Wallet.address,
          threeETH,
          twoETH,
          0,
          saleCount,
          l2ChainId,
          200000,
          saleInformation.hashValue
        )
        await providerTx.wait()
        // console.log("2")
        const messageReceipt = await messenger.waitForMessageReceipt(providerTx)

        // const messageReceipt = await messenger.waitForMessageStatus(providerTx.hash, MessageStatus.READY_FOR_RELAY)
        if (messageReceipt.receiptStatus !== 1) {
          throw new Error('provide failed')
        }
  
        let afterl2Balance = await l2erc20Token.balanceOf(l2Wallet.address)
        let afterl2BalanceUser1 = await l2erc20Token.balanceOf(l2user1.address)
  
        let afterl2NativeTokenBalance = await erc20Token.balanceOf(
          l1user1.address
        )
        // console.log("afterl2NativeTokenBalance(Provider) : ", afterl2NativeTokenBalance.toString())
  
        let afterl2NativeTokenBalanceWallet = await erc20Token.balanceOf(
          l1Wallet.address
        )
        // console.log("afterl2NativeTokenBalanceWallet(Requester) : ", afterl2NativeTokenBalanceWallet.toString())
  
        expect(afterl2Balance).to.be.equal(beforel2Balance)
        expect(afterl2BalanceUser1).to.be.gt(beforel2BalanceUser1)
        
        expect(beforel2NativeTokenBalance).to.be.gt(afterl2NativeTokenBalance)
        expect(afterl2NativeTokenBalanceWallet).to.be.gt(beforel2NativeTokenBalanceWallet)
  
        let afterL2CrossTradeBalance = await l2erc20Token.balanceOf(L2CrossTradeContract.address)

        expect(beforeL2CrossTradeBalance).to.be.gt(afterL2CrossTradeBalance)
  
        saleInformation = await L2CrossTradeContract.dealData(saleCount)
        if(saleInformation.provider !== l2user1.address) {
          console.log("===========Provider Fail!!===========")
        } 
      })
    })
  })

});
