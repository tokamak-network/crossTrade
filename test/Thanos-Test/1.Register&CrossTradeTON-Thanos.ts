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
  
  import { CrossChainMessenger, MessageStatus, NativeTokenBridgeAdapter, NumberLike } from '../../src'
  import L1CrossTradeProxy_ABI from "../../artifacts/contracts/L1/L1CrossTradeProxy.sol/L1CrossTradeProxy.json"
  import L1CrossTrade_ABI from "../../artifacts/contracts/L1/L1CrossTrade.sol/L1CrossTrade.json"
  import L2CrossTradeProxy_ABI from "../../artifacts/contracts/L2/L2CrossTradeProxy.sol/L2CrossTradeProxy.json"
  import L2CrossTrade_ABI from "../../artifacts/contracts/L2/L2CrossTrade.sol/L2CrossTrade.json"
  import Proxy_ABI from "../../artifacts/contracts/proxy/Proxy.sol/Proxy.json"
  
  import dotenv from "dotenv" ;
  
  dotenv.config();
  
  
  describe("1.Register&CrossTradeTON Test", function () {
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
  
    let editTime = 180
    
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
  
      
      it("L1CrossTradeLogic", async () => {
        const L1CrossTradeLogicDep = new ethers.ContractFactory(
          L1CrossTrade_ABI.abi,
          L1CrossTrade_ABI.bytecode,
          l1Wallet
        )
  
        L1CrossTradeLogic = await L1CrossTradeLogicDep.deploy()
        await L1CrossTradeLogic.deployed()
  
        // console.log("L1CrossTradeLogic :", L1CrossTradeLogic.address);
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
            l2NativeTokenContract.address,
            l2ChainId,
          )).wait();

          const chainData = await L1CrossTradeProxy.chainData(l2ChainId)
          if(chainData.crossDomainMessenger !== l1Contracts.L1CrossDomainMessenger){
            console.log("===========L1CrossTrade setChainInfo ERROR!!===========")
          }
      })

      it("L2CrossTrade initialize", async () => {
        await (await L2CrossTradeProxy.connect(l2Wallet).initialize(
            l2CrossDomainMessengerAddr,
            predeployedAddress.LegacyERC20ETH
        )).wait();

        const checkL2Inform = await L2CrossTradeProxy.crossDomainMessenger()
        if(checkL2Inform !== l2CrossDomainMessengerAddr){
          console.log("===========L2CrossTrade initialize ERROR!!===========")
        }
        let tx = await L2CrossTradeContract.saleCount()
        expect(tx).to.be.equal(0)
        tx = await L2CrossTradeContract.legacyERC20ETH()
        if(tx !== predeployedAddress.LegacyERC20ETH){
          console.log("===========L2CrossTrade initialize ERROR!!===========")
        }
      })

      it("L2CrossTrade setChainInfo", async () => {
        await (await L2CrossTradeProxy.connect(l2Wallet).setChainInfo(
            L1CrossTradeContract.address,
            l2NativeTokenContract.address,
            l1ChainId
        )).wait();

        const chainData = await L2CrossTradeProxy.chainData(l1ChainId)
        if(chainData.l1CrossTradeContract !== L1CrossTradeContract.address){
            console.log("===========L2CrossTrade l1CrossTradeContract ERROR!!===========")
        }
        if(chainData.l1TON !== l2NativeTokenContract.address){
            console.log("===========L2CrossTrade l2NativeTokenContract ERROR!!===========")
        }
      })
  
    });
  
    describe("CrossTrade(L1 TON, L2 NativeTON) Test", () => {
      it("if dont have TON, get TON", async () => {
        let l2NativeTokenBalance = await l2NativeTokenContract.balanceOf(
          l1Wallet.address
        )
        // console.log('native token(TON) balance in L1:', Number(l2NativeTokenBalance.toString()))
        if (Number(l2NativeTokenBalance.toString()) < Number(hundETH)) {
          // console.log('start faucet')
          const tx = await l2NativeTokenContract.connect(l1Wallet).faucet(hundETH)
          await tx.wait()
          // const l2NativeTokenBalance2 = await l2NativeTokenContract.balanceOf(
          //   l1Wallet.address
          // )
          // console.log('after faucet l2 native token(TON) balance in L1:', l2NativeTokenBalance2.toString())
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

      it("registerToken in L2", async () => {
        let registerCheck = await L2CrossTradeContract.registerCheck(
            l1ChainId,
            l2NativeTokenContract.address,
            predeployedAddress.LegacyERC20ETH
        )
        expect(registerCheck).to.be.equal(false)

        await (await L2CrossTradeContract.connect(l2Wallet).registerToken(
            l2NativeTokenContract.address,
            predeployedAddress.LegacyERC20ETH,
            l1ChainId
        )).wait()

        registerCheck = await L2CrossTradeContract.registerCheck(
            l1ChainId,
            l2NativeTokenContract.address,
            predeployedAddress.LegacyERC20ETH
        )
        expect(registerCheck).to.be.equal(true)
      })
  
      it("requestRegisteredToken(NativeTON) in L2", async () => {
        let beforel2Balance = await l2Wallet.getBalance()
        let beforeL2CrossTradeBalance = await l2Provider.getBalance(L2CrossTradeContract.address)
        
        await (await L2CrossTradeContract.connect(l2Wallet).requestRegisteredToken(
          l2NativeTokenContract.address,
          predeployedAddress.LegacyERC20ETH,
          threeETH,
          twoETH,
          l1ChainId,
          {
            value: threeETH
          }
        )).wait()
        let afterl2Balance = await l2Wallet.getBalance()
        let afterL2CrossTradeBalance = await l2Provider.getBalance(L2CrossTradeContract.address)
  
        const saleCount = await L2CrossTradeProxy.saleCount()
        expect(saleCount).to.be.equal(1);
  
        expect(beforel2Balance).to.be.gt(afterl2Balance)
        expect(afterL2CrossTradeBalance).to.be.gt(beforeL2CrossTradeBalance)
      })
  
      it("faucet TON to user1", async () => {
        let l2NativeTokenBalance = await l2NativeTokenContract.balanceOf(
          l1user1.address
        )
  
        if (Number(l2NativeTokenBalance.toString()) < Number(twoETH)) {
          // console.log('start faucet')
          const tx = await l2NativeTokenContract.connect(l1user1).faucet(twoETH)
          await tx.wait()
          // const l2NativeTokenBalance2 = await l2NativeTokenContract.balanceOf(
          //   l1user1.address
          // )
          // console.log('after faucet l2 native token(TON) balance in L1 (user1):', l2NativeTokenBalance2.toString())
        }
      })
  
      it("provideCT(TON) in L1", async () => {
        let beforel2Balance = await l2Wallet.getBalance()
        let beforel2BalanceUser1 = await l2user1.getBalance()
  
        let beforel2NativeTokenBalance = await l2NativeTokenContract.balanceOf(
          l1user1.address
        )
        console.log("beforel2NativeTokenBalance(Provider) : ", beforel2NativeTokenBalance.toString())
        let beforel2NativeTokenBalanceWallet = await l2NativeTokenContract.balanceOf(
          l1Wallet.address
        )
        console.log("beforel2NativeTokenBalanceWallet(Requester) : ", beforel2NativeTokenBalanceWallet.toString())
        let beforel2NativeTokenBalanceContract = await l2NativeTokenContract.balanceOf(
          l2NativeTokenContract.address
        )
        console.log("beforel2NativeTokenBalanceContract(Contract) : ", beforel2NativeTokenBalanceContract.toString())
      
        const providerApproveTx = await l2NativeTokenContract.connect(l1user1).approve(L1CrossTradeContract.address, twoETH)
        await providerApproveTx.wait()
      
        const saleCount = await L2CrossTradeProxy.saleCount()
        let chainId = await L2CrossTradeContract.getChainID()
  
        let beforeL2CrossTradeBalance = await l2Provider.getBalance(L2CrossTradeContract.address)
  
        let saleInformation = await L2CrossTradeContract.dealData(saleCount)
  
        const providerTx = await L1CrossTradeContract.connect(l1user1).provideCT(
          l2NativeToken,
          predeployedAddress.LegacyERC20ETH,
          l2Wallet.address,
          threeETH,
          twoETH,
          0,
          saleCount,
          chainId,
          200000,
          saleInformation.hashValue
        )
        await providerTx.wait()
      
        await messenger.waitForMessageStatus(providerTx.hash, MessageStatus.RELAYED)
  
        let afterl2Balance = await l2Wallet.getBalance()
        let afterl2BalanceUser1 = await l2user1.getBalance()
  
        let afterl2NativeTokenBalance = await l2NativeTokenContract.balanceOf(
          l1user1.address
        )
        console.log("afterl2NativeTokenBalance(Provider) : ", afterl2NativeTokenBalance.toString())
  
        let afterl2NativeTokenBalanceWallet = await l2NativeTokenContract.balanceOf(
          l1Wallet.address
        )
        console.log("afterl2NativeTokenBalanceWallet(Requester) : ", afterl2NativeTokenBalanceWallet.toString())
  
        let afterl2NativeTokenBalanceContract = await l2NativeTokenContract.balanceOf(
          l2NativeTokenContract.address
        )
        console.log("afterl2NativeTokenBalanceContract(Contract) : ", afterl2NativeTokenBalanceContract.toString())
  
  
        expect(afterl2Balance).to.be.equal(beforel2Balance)
        expect(afterl2BalanceUser1).to.be.gt(beforel2BalanceUser1)
        
        expect(beforel2NativeTokenBalance).to.be.gt(afterl2NativeTokenBalance)
        expect(afterl2NativeTokenBalanceWallet).to.be.gt(beforel2NativeTokenBalanceWallet)
  
        let afterL2CrossTradeBalance = await l2Provider.getBalance(L2CrossTradeContract.address)
        expect(beforeL2CrossTradeBalance).to.be.gt(afterL2CrossTradeBalance)
  
        saleInformation = await L2CrossTradeContract.dealData(saleCount)
        if(saleInformation.provider !== l2user1.address) {
          console.log("===========Provider Fail!!===========")
        } 
      })
    })
  
  });
  