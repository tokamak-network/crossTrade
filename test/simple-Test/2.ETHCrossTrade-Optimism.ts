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
import L2CrossTradeOP_ABI from "../../artifacts/contracts/L2/L2CrossTradeOP.sol/L2CrossTradeOP.json"
import L1CrossTradeOP_ABI from "../../artifacts/contracts/L1/L1CrossTradeOP.sol/L1CrossTradeOP.json"
import L1StandardBridgeABI from '../../contracts-bedrock/forge-artifacts/L1StandardBridge.sol/L1StandardBridge.json'
import OptimismMintableERC20TokenFactoryABI from '../../contracts-bedrock/forge-artifacts/OptimismMintableERC20Factory.sol/OptimismMintableERC20Factory.json'
import OptimismMintableERC20TokenABI from '../../contracts-bedrock/forge-artifacts/OptimismMintableERC20.sol/OptimismMintableERC20.json'
import MockERC20ABI from '../../contracts-bedrock/forge-artifacts/MockERC20Token.sol/MockERC20Token.json'
import MockTON_ABI from "../../artifacts/contracts/Mock/MockTON.sol/MockTON.json"
import MockERC20_ABI from "../../artifacts/contracts/MockERC20Token.sol/MockERC20Token.json"
import L2StandardERC20_ABI from "../../artifacts/contracts/Mock/L2StandardERC20.sol/L2StandardERC20.json"


import dotenv from "dotenv" ;

dotenv.config();

describe("ETH CrossTrade Optimism", function () {
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

  let L1CrossTradeOP : any;

  let L2CrossTradeOP : any;
  
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
    })
    
    it("L1CrossTradeOP", async () => {
      const L1CrossTradeLogicDep = new ethers.ContractFactory(
        L1CrossTradeOP_ABI.abi,
        L1CrossTradeOP_ABI.bytecode,
        l1Wallet
      )

      L1CrossTradeOP = await L1CrossTradeLogicDep.deploy()
      await L1CrossTradeOP.deployed()
    })

    it("L2CrossTradeOP", async () => {
      const L2CrossTradeLogicDep = new ethers.ContractFactory(
        L2CrossTradeOP_ABI.abi,
        L2CrossTradeOP_ABI.bytecode,
        l2Wallet
      )

      L2CrossTradeOP = await L2CrossTradeLogicDep.deploy()
      await L2CrossTradeOP.deployed()
    })

    it("L1CrossTrade setChainInfo", async () => {
      await (await L1CrossTradeOP.connect(l1Wallet).setChainInfo(
        l1Contracts.L1CrossDomainMessenger,
        L2CrossTradeOP.address,
        l2ChainId
      )).wait()

      let tx = await L1CrossTradeOP.chainData(l2ChainId)
      // console.log("tx :", tx);

      if(tx.crossDomainMessenger !== l1Contracts.L1CrossDomainMessenger){
        console.log("===========L1CrossTrade chainInfo ERROR!!===========")
      }
      if(tx.l2CrossTradeContract !== L2CrossTradeOP.address){
        console.log("===========L1CrossTrade chainInfo ERROR!!===========")
      }
    })

    it("L2CrossTrade initialize", async () => {
      await (await L2CrossTradeOP.connect(l2Wallet).initialize(
        l2CrossDomainMessengerAddr,
        L1CrossTradeOP.address,
        zeroAddr
      )).wait();
    
      const checkL2Inform = await L2CrossTradeOP.crossDomainMessenger()
      if(checkL2Inform !== l2CrossDomainMessengerAddr){
        console.log("===========L2CrossTrade initialize ERROR!!===========")
      }
      let tx = await L2CrossTradeOP.saleCount()
      expect(tx).to.be.equal(0)
      tx = await L2CrossTradeOP.nativeTokenL2()
      if(tx !== zeroAddr){
        console.log("===========L2CrossTrade initialize ERROR!!===========")
      }

    })

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

  describe("CrossTrade ETH Test", () => {
    describe("Request Test", () => {
      it("request(Request ETH) in L2", async () => {
        let beforel2Balance = await l2Wallet.getBalance()
        let beforeL2CrossTradeBalance = await l2Provider.getBalance(L2CrossTradeOP.address)
        
        await (await L2CrossTradeOP.connect(l2Wallet).request(
          zeroAddr,
          zeroAddr,
          threeETH,
          twoETH,
          l1ChainId,
          {
            value: threeETH
          }
        )).wait()

        let afterl2Balance = await await l2Wallet.getBalance()
          let afterL2CrossTradeBalance = await l2Provider.getBalance(L2CrossTradeOP.address)
  
        const saleCount = await L2CrossTradeOP.saleCount()
        expect(saleCount).to.be.equal(1);
  
        expect(beforel2Balance).to.be.gt(afterl2Balance)
        expect(afterL2CrossTradeBalance).to.be.gt(beforeL2CrossTradeBalance)
      })
    })

    describe("Provide Test", () => {
      it("wait the Call", async () => {
        sleep(5000);
        // console.log("wait time");
      })

      it("providerCT(ETH) in L1", async () => {
        let beforel2Balance = await l2Wallet.getBalance()
        let beforel2BalanceUser1 = await l2user1.getBalance()
  
        let beforel2NativeTokenBalance = await l1user1.getBalance()
        // console.log("beforel2NativeTokenBalance(Provider) : ", beforel2NativeTokenBalance.toString())
        let beforel2NativeTokenBalanceWallet = await l1Wallet.getBalance()
        // console.log("beforel2NativeTokenBalanceWallet(Requester) : ", beforel2NativeTokenBalanceWallet.toString())
      
        const saleCount = await L2CrossTradeOP.saleCount()
  
        let beforeL2CrossTradeBalance = await l2Provider.getBalance(L2CrossTradeOP.address)
  
        let saleInformation = await L2CrossTradeOP.dealData(saleCount)
        // console.log("1")
  
        const providerTx = await L1CrossTradeOP.connect(l1user1).provideCTOP(
          zeroAddr,
          zeroAddr,
          l2Wallet.address,
          threeETH,
          twoETH,
          0,
          saleCount,
          l2ChainId,
          200000,
          saleInformation.hashValue,
          {
            value: twoETH
          }
        )
        await providerTx.wait()
        // console.log("2")
        const messageReceipt = await messenger.waitForMessageReceipt(providerTx)

        // await messenger.waitForMessageStatus(providerTx.hash, MessageStatus.RELAYED)

        // const messageReceipt = await messenger.waitForMessageStatus(providerTx.hash, MessageStatus.READY_FOR_RELAY)
        if (messageReceipt.receiptStatus !== 1) {
          throw new Error('provide failed')
        }
  
        let afterl2Balance = await l2Wallet.getBalance()
        let afterl2BalanceUser1 = await l2user1.getBalance()
  
        let afterl2NativeTokenBalance = await l1user1.getBalance()
        // console.log("afterl2NativeTokenBalance(Provider) : ", afterl2NativeTokenBalance.toString())
  
        let afterl2NativeTokenBalanceWallet = await l1Wallet.getBalance()
        // console.log("afterl2NativeTokenBalanceWallet(Requester) : ", afterl2NativeTokenBalanceWallet.toString())
  
        expect(afterl2Balance).to.be.equal(beforel2Balance)
        expect(afterl2BalanceUser1).to.be.gt(beforel2BalanceUser1)
        
        expect(beforel2NativeTokenBalance).to.be.gt(afterl2NativeTokenBalance)
        expect(afterl2NativeTokenBalanceWallet).to.be.gt(beforel2NativeTokenBalanceWallet)
  
        let afterL2CrossTradeBalance = await l2Provider.getBalance(L2CrossTradeOP.address)

        expect(beforeL2CrossTradeBalance).to.be.gt(afterL2CrossTradeBalance)
  
        saleInformation = await L2CrossTradeOP.dealData(saleCount)
        if(saleInformation.provider !== l2user1.address) {
          console.log("===========Provider Fail!!===========")
        } 
      })
    })
  })

});
