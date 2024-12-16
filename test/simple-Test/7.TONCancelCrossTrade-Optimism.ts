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
import L2CrossTradeV1_ABI from "../../artifacts/contracts/L2/L2CrossTradeV1.sol/L2CrossTradeV1.json"
import L1CrossTradeV1_ABI from "../../artifacts/contracts/L1/L1CrossTradeV1.sol/L1CrossTradeV1.json"
import L1StandardBridgeABI from '../../contracts-bedrock/forge-artifacts/L1StandardBridge.sol/L1StandardBridge.json'
import OptimismMintableERC20TokenFactoryABI from '../../contracts-bedrock/forge-artifacts/OptimismMintableERC20Factory.sol/OptimismMintableERC20Factory.json'
import OptimismMintableERC20TokenABI from '../../contracts-bedrock/forge-artifacts/OptimismMintableERC20.sol/OptimismMintableERC20.json'
import MockERC20ABI from '../../contracts-bedrock/forge-artifacts/MockERC20Token.sol/MockERC20Token.json'
import MockTON_ABI from "../../artifacts/contracts/Mock/MockTON.sol/MockTON.json"
import MockERC20_ABI from "../../artifacts/contracts/MockERC20Token.sol/MockERC20Token.json"
import L2StandardERC20_ABI from "../../artifacts/contracts/Mock/L2StandardERC20.sol/L2StandardERC20.json"
import TON_ABI from "../../abi/TON.json"



import dotenv from "dotenv" ;

dotenv.config();

describe("TON CrossTrade Optimism", function () {
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

  let L1CrossTradeV1 : any;
  let L2CrossTradeV1 : any;
  
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

  function sleep(ms: any) {
    const wakeUpTime = Date.now() + ms;
    while (Date.now() < wakeUpTime) {}
  }
  
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
    
    it("L1CrossTradeV1", async () => {
      const L1CrossTradeLogicDep = new ethers.ContractFactory(
        L1CrossTradeV1_ABI.abi,
        L1CrossTradeV1_ABI.bytecode,
        l1Wallet
      )

      L1CrossTradeV1 = await L1CrossTradeLogicDep.deploy()
      await L1CrossTradeV1.deployed()
    })

    it("L2CrossTradeV1", async () => {
      const L2CrossTradeLogicDep = new ethers.ContractFactory(
        L2CrossTradeV1_ABI.abi,
        L2CrossTradeV1_ABI.bytecode,
        l2Wallet
      )

      L2CrossTradeV1 = await L2CrossTradeLogicDep.deploy()
      await L2CrossTradeV1.deployed()
    })

    it("L1CrossTrade setChainInfo", async () => {
      await (await L1CrossTradeV1.connect(l1Wallet).setChainInfo(
        l1Contracts.L1CrossDomainMessenger,
        L2CrossTradeV1.address,
        l2ChainId
      )).wait()

      let tx = await L1CrossTradeV1.chainData(l2ChainId)
      // console.log("tx :", tx);

      if(tx.crossDomainMessenger !== l1Contracts.L1CrossDomainMessenger){
        console.log("===========L1CrossTrade chainInfo ERROR!!===========")
      }
      if(tx.l2CrossTradeContract !== L2CrossTradeV1.address){
        console.log("===========L1CrossTrade chainInfo ERROR!!===========")
      }
    })

    it("L2CrossTrade initialize", async () => {
      await (await L2CrossTradeV1.connect(l2Wallet).initialize(
        l2CrossDomainMessengerAddr,
        L1CrossTradeV1.address,
        zeroAddr
      )).wait();
    
      const checkL2Inform = await L2CrossTradeV1.crossDomainMessenger()
      if(checkL2Inform !== l2CrossDomainMessengerAddr){
        console.log("===========L2CrossTrade initialize ERROR!!===========")
      }
      let tx = await L2CrossTradeV1.saleCount()
      expect(tx).to.be.equal(0)
      tx = await L2CrossTradeV1.nativeTokenL2()
      if(tx !== zeroAddr){
        console.log("===========L2CrossTrade initialize ERROR!!===========")
      }

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
    it("TON faucet", async () => {
      let TONBalance = await mockTON.balanceOf(
        l1Wallet.address
      )

      if (Number(TONBalance.toString()) < Number(hundETH)) {
        // console.log('start faucet')
        const tx = await mockTON.connect(l1Wallet).faucet(hundETH)
        await tx.wait()
        const l2NativeTokenBalance2 = await mockTON.balanceOf(
          l1Wallet.address
        )
        console.log('after faucet mockTON balance in L1(l1Wallet):', l2NativeTokenBalance2.toString())
      } 

    })
    
    it("TON transfer", async () => {
      const tx2 = await mockTON.connect(l1Wallet).transfer(l1user1.address,twoETH)
      await tx2.wait()
    })

    it("createOptimismMintableERC20 in L2", async () => {
      let name = await mockTON.name()
      let symbol = await mockTON.symbol()

      const tx = await OptimismMintableERC20TokenFactory.connect(l2Wallet).createOptimismMintableERC20(
        mockTON.address,
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
      l2mockTONAddr = event.args.localToken
      // console.log(`Deployed to ${l2mockTONAddr}`)
    })

    it("set l2TON", async () => {
      l2mockTON = new ethers.Contract(
        l2mockTONAddr,
        L2StandardERC20_ABI.abi,
        l2Wallet
      )
    })

    it("Deposit to L2 MockTON", async () => {
      const approvalTx = await messenger.approveERC20(
        mockTON.address,
        l2mockTON.address,
        tenETH
      )
      await approvalTx.wait()

      const depositTx = await messenger.depositERC20(
        mockTON.address,
        l2mockTON.address,
        tenETH
      )
      await depositTx.wait()

      const messageReceipt = await messenger.waitForMessageReceipt(depositTx)
      if (messageReceipt.receiptStatus !== 1) {
        throw new Error('deposit failed')
      }

      // let l2TONbalance = await l2mockTON.balanceOf(l2Wallet.address)
      //   console.log("l2TONbalance :", Number(l2TONbalance))
    })

  })

  describe("CrossTrade TON Test", () => {
    describe("Request Test", () => {
      it("requestRegisteredToken(Request TON) in L2", async () => {
        let beforel2Balance = await l2mockTON.balanceOf(l2Wallet.address)
        let beforeL2CrossTradeBalance = await l2mockTON.balanceOf(L2CrossTradeV1.address)

        const providerApproveTx = await l2mockTON.connect(l2Wallet).approve(L2CrossTradeV1.address, threeETH)
        await providerApproveTx.wait()
        
        await (await L2CrossTradeV1.connect(l2Wallet).request(
          mockTON.address,
          l2mockTON.address,
          threeETH,
          twoETH,
          l1ChainId
        )).wait()

        let afterl2Balance = await l2mockTON.balanceOf(l2Wallet.address)
        let afterL2CrossTradeBalance = await l2mockTON.balanceOf(L2CrossTradeV1.address)
  
        const saleCount = await L2CrossTradeV1.saleCount()
        expect(saleCount).to.be.equal(1);
  
        expect(beforel2Balance).to.be.gt(afterl2Balance)
        expect(afterL2CrossTradeBalance).to.be.gt(beforeL2CrossTradeBalance)
      })

      it("wait the Call", async () => {
        sleep(5000);
        // console.log("wait time");
      })
    })

    describe("Cancel Test", () => {
      it("cancel(TON) in L1", async () => {
        let beforel2Balance = await l2mockTON.balanceOf(l2Wallet.address)
        let beforeL2Contract = await l2mockTON.balanceOf(L2CrossTradeV1.address)

        const saleCount = await L2CrossTradeV1.saleCount()
        let saleInformation = await L2CrossTradeV1.dealData(saleCount)

        const cancelTx = await L1CrossTradeV1.connect(l1Wallet).cancelOP(
          mockTON.address,
          l2mockTON.address,
          threeETH,
          twoETH,
          saleCount,
          l2ChainId,
          200000,
          saleInformation.hashValue
        )
        await cancelTx.wait()

        await messenger.waitForMessageStatus(cancelTx.hash, MessageStatus.RELAYED)

        let afterl2Balance = await l2mockTON.balanceOf(l2Wallet.address)
        let afterL2Contract = await l2mockTON.balanceOf(L2CrossTradeV1.address)

        expect(afterl2Balance).to.be.gt(beforel2Balance)
        expect(beforeL2Contract).to.be.gt(afterL2Contract)
      })
    })
  })

});
