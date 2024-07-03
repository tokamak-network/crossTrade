import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { 
    Event, 
    Contract, 
    Wallet, 
    providers, 
    utils,
    BytesLike, 
    ethers
} from 'ethers'

import {
  BatchCrossChainMessenger,
  MessageStatus,
  CONTRACT_ADDRESSES
} from '@tokamak-network/titan-sdk'

import { expect } from "chai";

import OptimismMintableERC20_ABI from "../../abi/OptimismMintableERC20.json"
import OptimismMintableERC20Factory_ABI from "../../abi/OptimismMintableERC20Factory.json"
import L2StandardERC20_ABI from "../../artifacts/contracts/Mock/L2StandardERC20.sol/L2StandardERC20.json"
import WETH9_ABI from "../../abi/WETH9.json"
import TON_ABI from "../../abi/TON.json"
import MockERC20_ABI from "../../artifacts/contracts/MockERC20Token.sol/MockERC20Token.json"
import MockTON_ABI from "../../artifacts/contracts/Mock/MockTON.sol/MockTON.json"

import L1CrossTradeProxy_ABI from "../../artifacts/contracts/L1/L1CrossTradeProxy.sol/L1CrossTradeProxy.json"
import L1CrossTrade_ABI from "../../artifacts/contracts/L1/L1CrossTrade.sol/L1CrossTrade.json"
import L2CrossTradeProxy_ABI from "../../artifacts/contracts/L2/L2CrossTradeProxy.sol/L2CrossTradeProxy.json"
import L2CrossTrade_ABI from "../../artifacts/contracts/L2/L2CrossTrade.sol/L2CrossTrade.json"

import dotenv from "dotenv" ;

dotenv.config();

describe("CrossTradeERC20BasicTest-Titan", function () {
    
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
        process.env.Titan_L1_URL
    )
    const l2Provider = new ethers.providers.StaticJsonRpcProvider(
        process.env.Titan_L2_URL
    )
    const l1Wallet = new ethers.Wallet(privateKey, l1Provider)
    console.log('l1Wallet :', l1Wallet.address)
    const l1user1 = new ethers.Wallet(privateKey2, l1Provider)
    console.log('l1user1 :', l1user1.address)
    const l2Wallet = new ethers.Wallet(privateKey, l2Provider)
    // console.log('l2Wallet :', l2Wallet.address)
    const l2user1 = new ethers.Wallet(privateKey2, l2Provider)

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

    const l2CrossDomainMessengerAddr = '0x4200000000000000000000000000000000000007'
    const OptimismMintableERC20TokenFactoryAddr = '0x4200000000000000000000000000000000000012'
    let l1Contracts : any;
    let bridges : any;
    let messenger : any;

    let l1ChainId : any;
    let l2ChainId : any;

    let erc20Token : any;
    let l2erc20Token : any;
    let l2erc20Addr : any;
    let mockTON : any;
    let l2mockTON : any;
    let l2mockTONAddr : any;
    let OptimismMintableERC20TokenFactory : any;

    let l1CrossDomainMessenger = process.env.L1_CROSS_DOMAIN_MESSENGER || '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318'
    let l1StandardBridge = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788"

    before('create basic setting', async () => {
        l1ChainId = (await l1Provider.getNetwork()).chainId
        console.log("l1ChainId : ", l1ChainId)
        l2ChainId = (await l2Provider.getNetwork()).chainId
        console.log("l2ChainId : ", l2ChainId)

        l1Contracts = {
            L1CrossDomainMessenger: l1CrossDomainMessenger,
        }
        
        messenger = new BatchCrossChainMessenger({
            l1SignerOrProvider: l1Wallet,
            l2SignerOrProvider: l2Wallet,
            l1ChainId: (await l1Provider.getNetwork()).chainId,
            l2ChainId,
            bedrock: false,
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
  
      // it("L1CrossTrade initialize", async () => {
      //   await (await L1CrossTradeProxy.connect(l1Wallet).initialize(
      //     l1Contracts.L1CrossDomainMessenger
      //   )).wait()
  
      //   const checkL1Inform = await L1CrossTradeProxy.crossDomainMessenger()
      //   if(checkL1Inform !== l1Contracts.L1CrossDomainMessenger){
      //     console.log("===========L1CrossTrade initialize ERROR!!===========")
      //   }
      // })
  
      it("L1CrossTrade set chainInfo", async () => {
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
  
      it("L2CrossTrade set chainInfo", async () => {
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

      it("set the OptimismMintableERC20Factory", async () => {
        OptimismMintableERC20TokenFactory = new ethers.Contract(
          OptimismMintableERC20TokenFactoryAddr,
          OptimismMintableERC20Factory_ABI.abi,
          l2Wallet
        )
        // console.log(OptimismMintableERC20TokenFactory)
      })
    })

    describe("Prepare CrossTradeTest", () => {
      it("ERC20 mint", async () => {
        let TONBalance = await erc20Token.balanceOf(
          l1Wallet.address
        )

        if (Number(TONBalance.toString()) < Number(hundETH)) {
          const tx = await erc20Token.connect(l1Wallet).mint(
            l1Wallet.address,
            hundETH
          )
          await tx.wait()
        }
      })

      it("createOptimismMintableERC20", async () => {
        let name = await erc20Token.name()
        let symbol = await erc20Token.symbol()

        const tx = await OptimismMintableERC20TokenFactory.connect(l2Wallet).createStandardL2Token(
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
      
      it("Deposit to L2 MockTON", async () => {
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

        // let l2TONbalance = await l2mockTON.balanceOf(l2Wallet.address)
        // console.log("l2TONbalance :", Number(l2TONbalance))
      })

    })

    describe("CrossTrade Test", () => {
      describe("registerToken & requestRegisteredToken & Cancel Test", () => {
        it("registerToken can't use common user", async () => {
          let chainId = await L1CrossTradeContract._getChainID()
          await expect(L2CrossTradeContract.connect(l2user1).registerToken(
            erc20Token.address,
            l2erc20Token.address,
            chainId
          )).to.be.rejectedWith("Accessible: Caller is not an admin")
        })
  
        it("registerToken can only Owner", async () => {
          let chainId = await L1CrossTradeContract._getChainID()
          
          await (await L2CrossTradeContract.connect(l2Wallet).registerToken(
            erc20Token.address,
            l2erc20Token.address,
            chainId
          )).wait();
    
          let check = await L2CrossTradeContract.registerCheck(
            chainId,
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
          let chainId = await L1CrossTradeContract._getChainID()
          await expect(L2CrossTradeContract.connect(l2Wallet).registerToken(
            erc20Token.address,
            l2erc20Token.address,
            chainId
          )).to.be.rejectedWith("already registerToken")
        })
  
        it("requestRegisteredToken in L2", async () => {
          let beforel2Balance = await l2erc20Token.balanceOf(l2Wallet.address)
          let beforeL2CrossTradeBalance = await l2erc20Token.balanceOf(L2CrossTradeContract.address)
          
          const providerApproveTx = await l2erc20Token.connect(l2Wallet).approve(L2CrossTradeContract.address, threeETH)
          await providerApproveTx.wait()
          
          let tx = await L2CrossTradeContract.connect(l2Wallet).requestRegisteredToken(
            erc20Token.address,
            l2erc20Token.address,
            threeETH,
            twoETH,
            l1ChainId
          )
          const receipt = await tx.wait()
          const event = receipt.events.find(
            (e: Event) => e.event === 'RequestCT'
          )
          // console.log(event)
        
          if (!event) {
            throw new Error('Unable to find RequestCT event')
          }


          let afterl2Balance = await l2erc20Token.balanceOf(l2Wallet.address)
          let afterL2CrossTradeBalance = await l2erc20Token.balanceOf(L2CrossTradeContract.address)
    
          const saleCount = await L2CrossTradeProxy.saleCount()
          expect(saleCount).to.be.equal(1);
    
          expect(beforel2Balance).to.be.gt(afterl2Balance)
          expect(afterL2CrossTradeBalance).to.be.gt(beforeL2CrossTradeBalance)
        })

        it("You cannot cancel unless the request was made by you", async () => {
          const saleCount = await L2CrossTradeProxy.saleCount()
          let chainId = await L2CrossTradeContract.getChainID()
          let saleInformation = await L2CrossTradeContract.dealData(saleCount)

          await expect(L1CrossTradeContract.connect(l1user1).cancel(
            erc20Token.address,
            l2erc20Token.address,
            threeETH,
            twoETH,
            saleCount,
            chainId,
            200000,
            saleInformation.hashValue
          )).to.be.rejectedWith("Hash values do not match.")
        })

        it("cancel Test", async () => {
          let beforel2Balance = await l2erc20Token.balanceOf(l2Wallet.address)
          let beforeL2CrossTradeBalance = await l2erc20Token.balanceOf(L2CrossTradeContract.address)

          const saleCount = await L2CrossTradeProxy.saleCount()
          let chainId = await L2CrossTradeContract.getChainID()
          let saleInformation = await L2CrossTradeContract.dealData(saleCount)

          const cancelTx = await L1CrossTradeContract.connect(l1Wallet).cancel(
            erc20Token.address,
            l2erc20Token.address,
            threeETH,
            twoETH,
            saleCount,
            chainId,
            200000,
            saleInformation.hashValue
          )
          await cancelTx.wait()
          // console.log("2")
          const messageReceipt = await messenger.waitForMessageReceipt(cancelTx)

          if (messageReceipt.receiptStatus !== 1) {
            throw new Error('cancel failed')
          }

          let afterl2Balance = await l2erc20Token.balanceOf(l2Wallet.address)
          expect(afterl2Balance).to.be.gt(beforel2Balance)

          let afterL2CrossTradeBalance = await l2erc20Token.balanceOf(L2CrossTradeContract.address)
          expect(beforeL2CrossTradeBalance).to.be.gt(afterL2CrossTradeBalance)
        })

      })

      describe("requestNonRegisteredToken & Edit & Provide Test", () => {
        it("ERC20 mint", async () => {
          let TONBalance = await erc20Token.balanceOf(
            l1Wallet.address
          )
  
          if (Number(TONBalance.toString()) < Number(hundETH)) {
            const tx = await erc20Token.connect(l1Wallet).mint(
              l1Wallet.address,
              hundETH
            )
            await tx.wait()
          }
        })

        it("Deposit to L2 MockTON", async () => {
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
        })

        it("requestNonRegisteredToken in L2", async () => {
          let beforel2Balance = await l2erc20Token.balanceOf(l2Wallet.address)
          let beforeL2CrossTradeBalance = await l2erc20Token.balanceOf(L2CrossTradeContract.address)
          
          const providerApproveTx = await l2erc20Token.connect(l2Wallet).approve(L2CrossTradeContract.address, threeETH)
          await providerApproveTx.wait()
          
          let tx = await L2CrossTradeContract.connect(l2Wallet).requestNonRegisteredToken(
            erc20Token.address,
            l2erc20Token.address,
            threeETH,
            twoETH,
            l1ChainId
          )

          const receipt = await tx.wait()
          const event = receipt.events.find(
            (e: Event) => e.event === 'NonRequestCT'
          )
          // console.log(event)
        
          if (!event) {
            throw new Error('Unable to find EditCT event')
          }
          
          const saleCount = await L2CrossTradeProxy.saleCount()
          // console.log(saleCount)
          // console.log(event.args._saleCount)
          expect(event.args._saleCount).to.be.equal(saleCount)

          let afterl2Balance = await l2erc20Token.balanceOf(l2Wallet.address)
          let afterL2CrossTradeBalance = await l2erc20Token.balanceOf(L2CrossTradeContract.address)
    
          expect(beforel2Balance).to.be.gt(afterl2Balance)
          expect(afterL2CrossTradeBalance).to.be.gt(beforeL2CrossTradeBalance)
        })
  
        it("cancel Test", async () => {
          let beforel2Balance = await l2erc20Token.balanceOf(l2Wallet.address)
          let beforeL2CrossTradeBalance = await l2erc20Token.balanceOf(L2CrossTradeContract.address)

          const saleCount = await L2CrossTradeProxy.saleCount()
          let chainId = await L2CrossTradeContract.getChainID()
          let saleInformation = await L2CrossTradeContract.dealData(saleCount)

          const cancelTx = await L1CrossTradeContract.connect(l1Wallet).cancel(
            erc20Token.address,
            l2erc20Token.address,
            threeETH,
            twoETH,
            saleCount,
            chainId,
            200000,
            saleInformation.hashValue
          )
          await cancelTx.wait()
          // console.log("2")
          const messageReceipt = await messenger.waitForMessageReceipt(cancelTx)

          if (messageReceipt.receiptStatus !== 1) {
            throw new Error('cancel failed')
          }

          let afterl2Balance = await l2erc20Token.balanceOf(l2Wallet.address)
          expect(afterl2Balance).to.be.gt(beforel2Balance)

          let afterL2CrossTradeBalance = await l2erc20Token.balanceOf(L2CrossTradeContract.address)
          expect(beforeL2CrossTradeBalance).to.be.gt(afterL2CrossTradeBalance)
        })
        
      })
    })

})
