'use client'

import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId, useSwitchChain } from 'wagmi'
import { 
  l2_cross_trade_ABI, 
  // L2_L2 specific imports
  getChainsFor_L2_L2,
  getTokenAddressFor_L2_L2,
  getContractAddressFor_L2_L2,
  getAvailableTokensFor_L2_L2,
  // L2_L1 specific imports
  getChainsFor_L2_L1,
  getTokenAddressFor_L2_L1,
  getContractAddressFor_L2_L1,
  getAvailableTokensFor_L2_L1,
  // L2_L1 ABIs
  L2_L1_REQUEST_ABI,
} from '@/config/contracts'

// ERC20 ABI for approve function
const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export const CreateRequest = () => {
  const [requestFrom, setRequestFrom] = useState('Optimism')
  const [requestTo, setRequestTo] = useState('Thanos')
  const [sendAmount, setSendAmount] = useState('')
  const [sendToken, setSendToken] = useState('USDC') // Default to USDC
  const [receiveAmount, setReceiveAmount] = useState('')
  const [receiveToken, setReceiveToken] = useState('USDC') // Default to USDC
  const [toAddress, setToAddress] = useState('')
  const [serviceFeeMode, setServiceFeeMode] = useState('recommended') // 'recommended' or 'advanced'
  const [customFee, setCustomFee] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showConfirmingModal, setShowConfirmingModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [approvalTxHash, setApprovalTxHash] = useState<string | undefined>()
  const [isTokenApproved, setIsTokenApproved] = useState(false) // Track if token is approved

  // Native token address constant (0x0000... means native token - ETH, TON, etc.)
  const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError: txError } = useWaitForTransactionReceipt({ hash })
  const { address: connectedAddress } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  
  // Separate hook for approval transactions
  const { 
    writeContract: writeApproval, 
    data: approvalHash, 
    isPending: isApprovalPending,
    error: approvalError 
  } = useWriteContract()
  const { 
    isLoading: isApprovalConfirming, 
    isSuccess: isApprovalSuccess,
    isError: isApprovalTxError 
  } = useWaitForTransactionReceipt({ hash: approvalHash })

  // Helper function to get token decimals
  const getTokenDecimals = (tokenSymbol: string) => {
    switch (tokenSymbol) {
      case 'USDC':
      case 'USDT':
        return 6 // USDC and USDT use 6 decimals
      case 'ETH':
      case 'TON':
      default:
        return 18 // ETH and most tokens use 18 decimals
    }
  }

  // Automatically detect communication mode based on destination chain
  // If destination is Ethereum (L1) → L2_L1, otherwise → L2_L2
  const getCommunicationMode = (): 'L2_L2' | 'L2_L1' => {
    // Check if requestTo is Ethereum (L1)
    const isDestinationL1 = requestTo === 'Ethereum' || requestTo.includes('Ethereum')
    return isDestinationL1 ? 'L2_L1' : 'L2_L2'
  }

  const communicationMode = getCommunicationMode()

  // Mode-aware helper functions
  const getAvailableChains = () => {
    // Always return all chains from both configs
    const l2l2Chains = getChainsFor_L2_L2()
    const l2l1Chains = getChainsFor_L2_L1()
    
    // Merge and remove duplicates by chain ID
    const allChains = [...l2l2Chains, ...l2l1Chains]
    const uniqueChains = allChains.filter((chain, index, self) => 
      index === self.findIndex(c => c.chainId === chain.chainId)
    )
    
    return uniqueChains
  }

  const getTokenAddressForMode = (chainId: number, tokenSymbol: string) => {
    // Each mode strictly uses its own config - no fallbacks
    if (communicationMode === 'L2_L2') {
      return getTokenAddressFor_L2_L2(chainId, tokenSymbol)
    } else {
      return getTokenAddressFor_L2_L1(chainId, tokenSymbol)
    }
  }

  const getContractAddressForMode = (chainId: number, contractName: string) => {
    // Each mode strictly uses its own config - no fallbacks
    if (communicationMode === 'L2_L2') {
      return getContractAddressFor_L2_L2(chainId, contractName)
    } else {
      return getContractAddressFor_L2_L1(chainId, contractName)
    }
  }

  const getAvailableTokensForMode = (chainName: string) => {
    // Get tokens from both configs and merge them
    const l2l2Tokens = getAvailableTokensFor_L2_L2(chainName)
    const l2l1Tokens = getAvailableTokensFor_L2_L1(chainName)
    
    // Merge and remove duplicates
    const allTokens = [...l2l2Tokens, ...l2l1Tokens]
    const uniqueTokens = [...new Set(allTokens)]
    
    return uniqueTokens.length > 0 ? uniqueTokens : l2l2Tokens.length > 0 ? l2l2Tokens : l2l1Tokens
  }

  // Get chain ID by display name (checks both L2_L2 and L2_L1 configs)
  const getChainIdByName = (chainName: string): number => {
    // Try L2_L2 first
    let chains = getChainsFor_L2_L2()
    let chain = chains.find(c => c.config.display_name === chainName)
    if (chain) return chain.chainId
    
    // Try L2_L1 if not found
    chains = getChainsFor_L2_L1()
    chain = chains.find(c => c.config.display_name === chainName)
    return chain?.chainId || 0
  }


  // Reset token selection when chain changes
  useEffect(() => {
    const availableSendTokens = getAvailableTokensForMode(requestFrom)
    const availableReceiveTokens = getAvailableTokensForMode(requestTo)
    
    // Reset send token if current selection is not available
    if (!availableSendTokens.includes(sendToken) && availableSendTokens.length > 0) {
      setSendToken(availableSendTokens[0])
    }
    
    // Reset receive token if current selection is not available
    if (!availableReceiveTokens.includes(receiveToken) && availableReceiveTokens.length > 0) {
      setReceiveToken(availableReceiveTokens[0])
    }
  }, [requestFrom, requestTo, sendToken, receiveToken])

  // Helper function to convert amount to wei based on token decimals
  const toTokenWei = (amount: string, tokenSymbol: string) => {
    const decimals = getTokenDecimals(tokenSymbol)
    return BigInt(Math.floor(parseFloat(amount || '0') * Math.pow(10, decimals)))
  }

  // Calculate service fee and you receive amount
  const calculateFee = () => {
    const sendAmountNum = parseFloat(sendAmount) || 0
    
    if (serviceFeeMode === 'recommended') {
      // 2% fee for recommended
      return sendAmountNum * 0.02
    } else {
      // Advanced mode - use custom fee value or default 1
      const feeValue = parseFloat(customFee) || 1
      return feeValue
    }
  }

  const calculateReceiveAmount = () => {
    const sendAmountNum = parseFloat(sendAmount) || 0
    const fee = calculateFee()
    const result = sendAmountNum - fee
    return result > 0 ? result.toFixed(6) : '0' // Show more precision for 6-decimal tokens
  }

  // Update receive amount when send amount or fee changes
  const currentReceiveAmount = calculateReceiveAmount()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent submission if wallet not connected
    if (!connectedAddress) {
      return
    }
    
    // Show confirmation modal instead of submitting directly
    setShowConfirmModal(true)
  }

  const handleConfirmRequest = async () => {
    // Get the source token address to check if it's native token
    const fromChainId = getChainIdByName(requestFrom)
    const l2SourceTokenAddress = getTokenAddressForMode(fromChainId, sendToken)
    const isNativeToken = l2SourceTokenAddress?.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()
    
    // If token is not native (0x0000...) and not yet approved, do approval first
    if (!isNativeToken && !isTokenApproved) {
      await handleApproval()
    } else {
      // For native tokens or if already approved, go to main transaction
      setShowConfirmModal(false)
      await handleMainTransaction()
    }
  }

  const handleApproval = async () => {
    setIsApproving(true)
    setShowConfirmingModal(true)

    try {
      // Get all the dynamic parameters from the form state
      // Get chain IDs from our configuration (mode-aware)
      const fromChainId = getChainIdByName(requestFrom)
      const toChainId = getChainIdByName(requestTo)
      
      // Get token addresses for the respective chains (mode-aware)
      const l2SourceTokenAddress = getTokenAddressForMode(fromChainId, sendToken) // Token on source chain
      const l2DestinationTokenAddress = getTokenAddressForMode(toChainId, receiveToken) // Token on destination chain
      
      // Get the CrossTrade contract address (this is the spender) (mode-aware)
      const crossTradeContractAddress = getContractAddressForMode(fromChainId, 'l2_cross_trade')
      
      if (!crossTradeContractAddress) {
        throw new Error(`l2_cross_trade contract address not found for chain ${fromChainId}`)
      }
      
      // Amount calculations with correct decimals
      const totalAmountWei = toTokenWei(sendAmount, sendToken)
      const ctAmountWei = toTokenWei(currentReceiveAmount, receiveToken)

      // Connected wallet info
      const connectedWallet = connectedAddress
      const recipientAddress = toAddress

      console.log('🎯 Approval Parameters:', {
        // Chain Information
        fromChain: requestFrom,
        fromChainId: fromChainId,
        toChain: requestTo,
        toChainId: toChainId,
        
        // Token Information
        sendToken: sendToken,
        receiveToken: receiveToken,
        l2SourceTokenAddress: l2SourceTokenAddress,
        l2DestinationTokenAddress: l2DestinationTokenAddress,
        
        // Contract Information
        crossTradeContract: crossTradeContractAddress,
        
        // Amount Information
        sendAmount: sendAmount,
        receiveAmount: currentReceiveAmount,
        totalAmountWei: totalAmountWei.toString(),
        ctAmountWei: ctAmountWei.toString(),
        
        // Address Information
        connectedWallet: connectedWallet,
        recipientAddress: recipientAddress,
        
        // Approval Details
        tokenToApprove: l2SourceTokenAddress, // This is the token contract we're calling approve() on
        spender: crossTradeContractAddress,   // This is who we're approving to spend
        amountToApprove: totalAmountWei.toString() // This is how much we're approving
      })

      // Validate that we have the required addresses
      if (!l2SourceTokenAddress || l2SourceTokenAddress === '') {
        throw new Error(`No token address found for ${sendToken} on ${requestFrom} (Chain ID: ${fromChainId})`)
      }
      
      if (!crossTradeContractAddress || crossTradeContractAddress === '') {
        throw new Error('CrossTrade contract address not found')
      }

      console.log(`📝 Calling approve() on ${sendToken} token contract:`, {
        contract: l2SourceTokenAddress,
        function: 'approve',
        spender: crossTradeContractAddress,
        amount: totalAmountWei.toString()
      })

      // Check if user is on the correct network
      console.log('🌐 Network Check:', {
        currentChainId: chainId,
        requiredChainId: fromChainId,
        needsSwitch: chainId !== fromChainId
      })
      
      if (chainId !== fromChainId) {
        console.log('🔄 Switching to required network...')
        try {
          await switchChain({ chainId: fromChainId })
          console.log('✅ Network switched successfully')
          // Wait a moment for the network switch to complete
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (switchError) {
          console.error('❌ Failed to switch network:', switchError)
          alert(`Please manually switch to ${requestFrom} network in your wallet`)
          setIsApproving(false)
          setShowConfirmingModal(false)
          return
        }
      }

      // Call approve on the L2 source token contract
      console.log('🚀 About to call writeApproval with:', {
        address: l2SourceTokenAddress,
        chainId: fromChainId,
        spender: crossTradeContractAddress,
        amount: totalAmountWei.toString()
      })
      
      const result = await writeApproval({
        address: l2SourceTokenAddress as `0x${string}`, // ERC20 token contract to call approve() on
        abi: ERC20_ABI,
        functionName: 'approve',
        chainId: fromChainId, // Execute on the source chain (e.g., Optimism Sepolia)
        args: [
          crossTradeContractAddress as `0x${string}`, // spender = CrossTrade contract
          totalAmountWei // amount to approve (total send amount)
        ]
      })
      
      console.log('✅ writeApproval result:', result)
    } catch (error) {
      console.error('❌ Approval failed:', error)
      console.error('Error details:', {
        name: (error as any)?.name,
        message: (error as any)?.message,
        cause: (error as any)?.cause,
        code: (error as any)?.code
      })
      setIsApproving(false)
      setShowConfirmingModal(false)
    }
  }

  const handleMainTransaction = async () => {
    if (!isApproving) {
      setShowConfirmingModal(true)
    }

    try {
      // Get chain IDs from our configuration (mode-aware)
      const fromChainId = getChainIdByName(requestFrom)
      const toChainId = getChainIdByName(requestTo)

      // Get token addresses for the respective chains (mode-aware)
      const l2SourceTokenAddress = getTokenAddressForMode(fromChainId, sendToken) // L2 source token (from chain)
      const l2DestinationTokenAddress = getTokenAddressForMode(toChainId, receiveToken) // L2 destination token (to chain)

      // Get contract address for the current chain (mode-aware)
      const contractAddress = getContractAddressForMode(fromChainId, 'l2_cross_trade')
      
      if (!contractAddress) {
        throw new Error(`l2_cross_trade contract address not found for chain ${fromChainId}`)
      }

      // Check if user is on the correct network for main transaction
      console.log('🌐 Main Transaction Network Check:', {
        currentChainId: chainId,
        requiredChainId: fromChainId,
        needsSwitch: chainId !== fromChainId,
        communicationMode: communicationMode
      })
      
      if (chainId !== fromChainId) {
        console.log('🔄 Switching to required network for main transaction...')
        try {
          await switchChain({ chainId: fromChainId })
          console.log('✅ Network switched successfully')
          // Wait a moment for the network switch to complete
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (switchError) {
          console.error('❌ Failed to switch network:', switchError)
          alert(`Please manually switch to ${requestFrom} network in your wallet`)
          setIsApproving(false)
          setShowConfirmingModal(false)
          return
        }
      }

      // CRITICAL: L2_L2 and L2_L1 use DIFFERENT contracts with DIFFERENT ABIs!
      // 
      // L2_L2 Mode (NEW Implementation):
      // - L2 Contract: L2toL2CrossTradeL2.sol with requestRegisteredToken(8 params)
      // - L1 Contract: L2toL2CrossTradeL1.sol
      // - Parameters: _l1token, _l2SourceToken, _l2DestinationToken, _receiver, _totalAmount, _ctAmount, _l1ChainId, _l2DestinationChainId
      //
      // L2_L1 Mode (OLD Implementation):
      // - L2 Contract: L2CrossTrade.sol with requestRegisteredToken(6 params)
      // - L1 Contract: L1CrossTrade.sol
      // - Parameters: _l1token, _l2token, _receiver, _totalAmount, _ctAmount, _l1chainId
      
      if (communicationMode === 'L2_L2') {
        // L2 to L2 communication: Get L1 token address from Ethereum Sepolia
        const l1ChainId = 11155111 // Ethereum Sepolia
        const l1TokenAddress = getTokenAddressForMode(l1ChainId, sendToken) // L1 token

        console.log('📝 L2_L2 Contract call parameters:', {
          mode: 'L2_L2',
          contractAddress,
          l1TokenAddress,
          l2SourceTokenAddress,
          l2DestinationTokenAddress,
          fromChainId,
          toChainId,
          totalAmount: toTokenWei(sendAmount, sendToken).toString(),
          ctAmount: toTokenWei(currentReceiveAmount, receiveToken).toString(),
          l1ChainId,
          abi: 'l2_cross_trade_ABI',
          config: 'CHAIN_CONFIG_L2_L2'
        })

        // Check if source token is native (0x0000...)
        const isNativeToken = l2SourceTokenAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()
        
        await writeContract({
          address: contractAddress as `0x${string}`,
          abi: l2_cross_trade_ABI, // Same ABI for both modes (L2toL2CrossTradeL2.sol)
          functionName: 'requestRegisteredToken',
          chainId: fromChainId, // Execute on the source L2 chain
          args: [
            l1TokenAddress as `0x${string}`, // l1token
            l2SourceTokenAddress as `0x${string}`, // l2SourceToken
            l2DestinationTokenAddress as `0x${string}`, // l2DestinationToken
            toAddress as `0x${string}`, // _receiver (to address)
            toTokenWei(sendAmount, sendToken), // totalAmount with correct decimals
            toTokenWei(currentReceiveAmount, receiveToken), // ctAmount with correct decimals
            BigInt(l1ChainId), // l1ChainId (Ethereum Sepolia for L2_L2)
            BigInt(toChainId) // l2DestinationChainId
          ],
          value: isNativeToken ? toTokenWei(sendAmount, sendToken) : BigInt(0)
        })
      } else {
        // L2 to L1 communication: Uses OLD L2CrossTrade.sol contract (6 params)
        const l1ChainId = 11155111 // Ethereum Sepolia
        const l1TokenAddress = getTokenAddressForMode(l1ChainId, sendToken) // L1 token from L2_L1 config

        console.log('📝 L2_L1 Contract call parameters:', {
          mode: 'L2_L1',
          contractAddress, // From L2_L1 config (OLD contract)
          l1TokenAddress, // From L2_L1 config
          l2SourceTokenAddress, // From L2_L1 config (used as _l2token in OLD contract)
          fromChainId,
          totalAmount: toTokenWei(sendAmount, sendToken).toString(),
          ctAmount: toTokenWei(currentReceiveAmount, receiveToken).toString(),
          l1ChainId,
          abi: 'L2_L1_REQUEST_ABI (OLD contract - 6 params)',
          config: 'CHAIN_CONFIG_L2_L1',
          note: 'OLD contract: requestRegisteredToken(_l1token, _l2token, _receiver, _totalAmount, _ctAmount, _l1chainId)'
        })

        // Check if source token is native (0x0000...)
        const isNativeTokenL2L1 = l2SourceTokenAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()
        
        // L2_L1 uses OLD L2CrossTrade.sol contract with 6 parameters
        await writeContract({
          address: contractAddress as `0x${string}`,
          abi: L2_L1_REQUEST_ABI, // OLD contract ABI (6 params)
          functionName: 'requestRegisteredToken',
          chainId: fromChainId, // Execute on the source L2 chain
          args: [
            l1TokenAddress as `0x${string}`, // _l1token
            l2SourceTokenAddress as `0x${string}`, // _l2token (only source token in OLD contract)
            toAddress as `0x${string}`, // _receiver (to address)
            toTokenWei(sendAmount, sendToken), // _totalAmount with correct decimals
            toTokenWei(currentReceiveAmount, receiveToken), // _ctAmount with correct decimals
            BigInt(l1ChainId) // _l1chainId
          ],
          value: isNativeTokenL2L1 ? toTokenWei(sendAmount, sendToken) : BigInt(0)
        })
      }
    } catch (error) {
      console.error('Transaction failed:', error)
      setIsApproving(false)
      setShowConfirmingModal(false)
    }
  }

  // Auto-fill to address with connected wallet
  useEffect(() => {
    if (connectedAddress && !toAddress) {
      setToAddress(connectedAddress)
    }
  }, [connectedAddress, toAddress])

  // Handle approval transaction states
  useEffect(() => {
    if (isApprovalSuccess && isApproving) {
      console.log('Approval successful! Now user can proceed with Request.')
      setIsApproving(false)
      setIsTokenApproved(true) // Mark token as approved
      setShowConfirmingModal(false) // Close confirming modal
      // Keep confirm modal open so user can click "Request"
    }
    if (isApprovalTxError && isApproving) {
      console.error('Approval transaction failed')
      setIsApproving(false)
      setShowConfirmingModal(false)
    }
  }, [isApprovalSuccess, isApprovalTxError, isApproving])

  // Handle main transaction states
  useEffect(() => {
    if (isSuccess) {
      setShowConfirmingModal(false)
      setShowConfirmModal(false) // Close confirm modal
      setShowSuccessModal(true)
      setIsApproving(false)
      setIsTokenApproved(false) // Reset approval state for next transaction
    }
    if (txError || writeError) {
      console.error('Main transaction failed:', txError || writeError)
      setShowConfirmingModal(false)
      setIsApproving(false)
    }
  }, [isSuccess, txError, writeError])

  return (
    <div className="create-request-container">
      <div className="geometric-background">
        <svg className="geometric-lines" viewBox="0 0 1200 800" fill="none">
          <path d="M50 150 L250 80 L450 200 L650 120 L850 180" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1.5"/>
          <path d="M150 350 L350 280 L550 400 L750 320 L950 380" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="1.5"/>
          <path d="M0 550 L200 480 L400 600 L600 520 L800 580" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="1.5"/>
          <path d="M700 80 L900 150 L1100 30 L1200 100" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1.5"/>
          <path d="M800 280 L1000 350 L1200 230" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="1.5"/>
          <path d="M650 480 L850 550 L1050 430 L1200 500" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="1.5"/>
          <path d="M300 50 L500 120 L700 0" stroke="rgba(99, 102, 241, 0.18)" strokeWidth="1.5"/>
          <path d="M100 700 L300 630 L500 750 L700 680" stroke="rgba(99, 102, 241, 0.12)" strokeWidth="1.5"/>
        </svg>
      </div>

      <div className="content">
        <div className="header-section">
          <h1 className="page-title">Create a request</h1>
          <a href="/request-pool" className="request-pool-button">
            Request Pool
          </a>
        </div>
        
        <div className="form-container">
          <form onSubmit={handleSubmit} className="request-form">
            {/* Mode Indicator */}
            <div style={{ 
              padding: '12px', 
              marginBottom: '16px', 
              borderRadius: '8px', 
              backgroundColor: communicationMode === 'L2_L2' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(34, 197, 94, 0.1)',
              border: `1px solid ${communicationMode === 'L2_L2' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>
                {communicationMode === 'L2_L2' ? '🔄 L2 ↔ L2 Mode' : '🌉 L2 ↔ L1 Mode'}
              </span>
              <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)' }}>
                {communicationMode === 'L2_L2' 
                  ? 'Cross-chain transfer between Layer 2 networks' 
                  : 'Bridge transfer between Layer 2 and Layer 1'}
              </span>
            </div>

            {/* Request From/To Section */}
            <div className="chain-selector-row">
              <div className="chain-selector">
                <label className="form-label">Request from</label>
                <div className="select-wrapper">
                  <select 
                    value={requestFrom} 
                    onChange={(e) => setRequestFrom(e.target.value)}
                    className="chain-select"
                  >
                    {[...getChainsFor_L2_L2(), ...getChainsFor_L2_L1()]
                      // Remove duplicates by chain ID
                      .filter((chain, index, self) => 
                        index === self.findIndex(c => c.chainId === chain.chainId)
                      )
                      .map(({ chainId, config }) => (
                        <option key={chainId} value={config.display_name}>
                          {config.display_name}
                        </option>
                      ))
                    }
                  </select>
                </div>
              </div>

              <div className="arrow-container">
                <div className="arrow">→</div>
              </div>

              <div className="chain-selector">
                <label className="form-label">Request on</label>
                <div className="select-wrapper">
                  <select 
                    value={requestTo} 
                    onChange={(e) => setRequestTo(e.target.value)}
                    className="chain-select"
                  >
                    {[...getChainsFor_L2_L2(), ...getChainsFor_L2_L1()]
                      // Remove duplicates by chain ID
                      .filter((chain, index, self) => 
                        index === self.findIndex(c => c.chainId === chain.chainId)
                      )
                      .map(({ chainId, config }) => (
                        <option key={chainId} value={config.display_name}>
                          {config.display_name}
                        </option>
                      ))
                    }
                  </select>
                </div>
              </div>
            </div>

            {/* You Send Section */}
            <div className="amount-section">
              <label className="form-label">You Send</label>
              <div className="amount-input-container">
                <input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="10.01"
                  className="amount-input"
                />
                <div className="token-selector">
                  <div className="token-icon">🔵</div>
                  <select 
                    value={sendToken} 
                    onChange={(e) => setSendToken(e.target.value)}
                    className="token-select"
                  >
                    {getAvailableTokensForMode(requestFrom).map((token) => (
                      <option key={token} value={token}>
                        {token}
                      </option>
                    ))}
                  </select>
                  <div className="dropdown-arrow">▼</div>
                </div>
              </div>
              <div className="balance-info">Balance: 19.21 <span className="max-btn">Max</span></div>
            </div>

            {/* You Receive and To Address Section */}
            <div className="receive-address-row">
              <div className="receive-section">
                <label className="form-label">You receive</label>
                <div className="amount-input-container">
                  <input
                    type="number"
                    value={currentReceiveAmount}
                    readOnly
                    placeholder="9.5"
                    className="amount-input readonly you-receive"
                  />
                  <div className="token-selector">
                    <div className="token-icon">🔵</div>
                    <select 
                      value={receiveToken} 
                      onChange={(e) => setReceiveToken(e.target.value)}
                      className="token-select"
                    >
                      {getAvailableTokensForMode(requestTo).map((token) => (
                        <option key={token} value={token}>
                          {token}
                        </option>
                      ))}
                    </select>
                    <div className="dropdown-arrow">▼</div>
                  </div>
                </div>
              </div>

              <div className="address-section">
                <label className="form-label">To address</label>
                <input
                  type="text"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  placeholder="0x9120...1234"
                  className="address-input"
                />
              </div>
            </div>

            {/* Service Fee Section */}
            <div className="service-fee-section">
              <label className="form-label">Service Fee</label>
              
              {/* Recommended Option */}
              <div 
                className={`fee-option ${serviceFeeMode === 'recommended' ? 'active' : ''}`}
                onClick={() => setServiceFeeMode('recommended')}
              >
                <div className="fee-option-header">
                  <span className="fee-label">Recommended ⓘ</span>
                  <span className="fee-amount">≈ 0.0012 ETH</span>
                </div>
                <div className="fee-details">
                  <span className="fee-percentage">2.00%</span>
                  <span className="fee-value">{calculateFee().toFixed(2)}</span>
                  <span className="fee-token">USDC</span>
                </div>
              </div>

              {/* Advanced Option */}
              <div 
                className={`fee-option advanced ${serviceFeeMode === 'advanced' ? 'active' : ''}`}
                onClick={() => setServiceFeeMode('advanced')}
              >
                <div className="fee-option-header">
                  <span className="fee-label">Advanced ⓘ</span>
                  <span className="fee-amount">≈ 0.0012 ETH</span>
                </div>
                <div className="fee-details">
                  <span className="fee-percentage">
                    {sendAmount ? ((parseFloat(customFee) || 1) / (parseFloat(sendAmount) || 1) * 100).toFixed(2) + '%' : '10.00%'}
                  </span>
                  <input
                    type="number"
                    value={customFee}
                    onChange={(e) => setCustomFee(e.target.value)}
                    placeholder="1"
                    className="fee-input"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="fee-token">USDC</span>
                </div>
              </div>
            </div>

            {/* Request/Connect Button */}
            <button 
              type={connectedAddress ? "submit" : "button"} 
              className="request-button"
              onClick={connectedAddress ? undefined : () => {
                // Trigger AppKit modal programmatically
                const appkitButton = document.querySelector('appkit-button') as any;
                if (appkitButton) appkitButton.click();
              }}
            >
              {connectedAddress ? "Request" : "Please Connect Wallet"}
            </button>
          </form>
        </div>

        {/* Hidden AppKit button for programmatic wallet connection */}
        <appkit-button style={{ display: 'none' }} />

      </div>
      
      <footer className="footer">
        Copyright © 2025. All rights reserved.
      </footer>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="modal-header">
              <h3>Confirm Request</h3>
              <button onClick={() => setShowConfirmModal(false)} className="close-btn">✕</button>
            </div>
            
            <div className="confirm-details">
              <div className="detail-row">
                <span className="detail-label">From</span>
                <span className="detail-value">🟣 {requestFrom}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">To</span>
                <span className="detail-value">🟢 {requestTo}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Send</span>
                <span className="detail-value">{sendAmount} 🔵 {sendToken}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Receive</span>
                <span className="detail-value">{currentReceiveAmount} 🔵 {receiveToken}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">From address</span>
                <span className="detail-value">{connectedAddress ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}` : '0x1234...1234'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">To address</span>
                <span className="detail-value">{toAddress ? `${toAddress.slice(0, 6)}...${toAddress.slice(-4)}` : '0x1234...1234'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Network</span>
                <span className="detail-value">{requestFrom} → {requestTo}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Network fee</span>
                <span className="detail-value">0.0012 ETH</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Service fee</span>
                <span className="detail-value">
                  <span className="fee-badge">{serviceFeeMode === 'recommended' ? '2.00%' : ((parseFloat(customFee) || 1) / (parseFloat(sendAmount) || 1) * 100).toFixed(2) + '%'}</span>
                  {calculateFee().toFixed(2)} {sendToken}
                </span>
              </div>
            </div>

            <div className="terms-section">
              <label className="checkbox-label">
                <input type="checkbox" defaultChecked />
                I understand there is no guaranteed deadline.
              </label>
              <label className="checkbox-label">
                <input type="checkbox" defaultChecked />
                I understand the request can be edited from L1.
              </label>
            </div>

            <button onClick={handleConfirmRequest} className="confirm-btn">
              {(() => {
                const fromChainId = getChainIdByName(requestFrom)
                const l2SourceTokenAddress = getTokenAddressForMode(fromChainId, sendToken)
                const isNativeToken = l2SourceTokenAddress?.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()
                
                return isNativeToken 
                  ? 'Request' 
                  : isTokenApproved 
                    ? 'Request' 
                    : `Approve ${sendToken}`
              })()}
            </button>
          </div>
        </div>
      )}

      {/* Confirming Modal */}
      {showConfirmingModal && (
        <div className="modal-overlay">
          <div className="status-modal">
            <button onClick={() => {
              setShowConfirmingModal(false)
              setIsApproving(false)
            }} className="close-btn">✕</button>
            <h3>{isApproving ? 'Approving Token' : 'Confirming'}</h3>
            <div className="loading-spinner"></div>
            <p>
              {isApproving 
                ? `Please approve ${sendToken} spending in your wallet first.`
                : 'Please confirm txn. If it\'s not updating, check your wallet.'
              }
            </p>
            {isApproving && (
              <div className="approval-info">
                <small>Step 1 of 2: Token approval required</small>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="status-modal">
            <button onClick={() => setShowSuccessModal(false)} className="close-btn">✕</button>
            <h3>Transaction Confirmed!</h3>
            <div className="success-checkmark">✓</div>
            <p>See your transaction history</p>
            {hash && (
              <div className="tx-hash">
                <small>TX: {hash}</small>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .create-request-container {
          min-height: 100vh;
          background: #0a0a0a;
          position: relative;
          overflow: hidden;
        }

        .geometric-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1;
        }

        .geometric-lines {
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
        }

        .content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 60px 20px;
        }

        .header-section {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }

        .page-title {
          color: #ffffff;
          font-size: 28px;
          font-weight: 600;
          margin: 0;
          text-align: center;
        }

        .request-pool-button {
          background: rgba(26, 26, 26, 0.8);
          border: 1px solid #333333;
          border-radius: 8px;
          padding: 12px 20px;
          color: #ffffff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
        }

        .request-pool-button:hover {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.1);
        }
        .you-receive {
          width: 120px;
        }

        .form-container {
          background: rgba(20, 20, 20, 0.8);
          border: 1px solid #333333;
          border-radius: 16px;
          padding: 24px;
          width: 100%;
          max-width: 480px;
          backdrop-filter: blur(10px);
        }

        .request-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .chain-selector-row {
          display: flex;
          align-items: end;
          gap: 16px;
        }

        .chain-selector {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .arrow-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding-bottom: 8px;
        }

        .arrow {
          color: #9ca3af;
          font-size: 20px;
          font-weight: bold;
        }

        .form-label {
          color: #9ca3af;
          font-size: 14px;
          font-weight: 500;
        }

        .select-wrapper {
          position: relative;
        }

        .chain-select {
          width: 100%;
          background: #1a1a1a;
          border: 1px solid #333333;
          border-radius: 8px;
          padding: 10px 14px;
          color: #ffffff;
          font-size: 14px;
          appearance: none;
          cursor: pointer;
        }

        .chain-select:focus {
          outline: none;
          border-color: #6366f1;
        }

        .amount-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .receive-address-row {
          display: flex;
          gap: 6px;
        }

        .receive-section {
          flex: 0.35;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .amount-input-container {
          display: flex;
          background: #1a1a1a;
          border: 1px solid #333333;
          border-radius: 8px;
          overflow: hidden;
        }

        .amount-input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 10px 14px;
          color: #ffffff;
          font-size: 14px;
          outline: none;
        }

        .amount-input::placeholder {
          color: #6b7280;
        }

        .amount-input.readonly {
          background: rgba(26, 26, 26, 0.5);
          cursor: not-allowed;
        }

        .token-selector {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 10px 6px;
          border-left: 1px solid #333333;
          background: #262626;
          cursor: pointer;
          min-width: 70px;
        }

        .token-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .token-select {
          background: transparent;
          border: none;
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          appearance: none;
          cursor: pointer;
          outline: none;
        }

        .dropdown-arrow {
          color: #9ca3af;
          font-size: 12px;
        }

        .address-section {
          flex: 1.65;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .address-input {
          background: #1a1a1a;
          border: 1px solid #333333;
          border-radius: 8px;
          padding: 10px 14px;
          color: #ffffff;
          font-size: 14px;
          outline: none;
        }

        .address-input:focus {
          border-color: #6366f1;
        }

        .address-input::placeholder {
          color: #6b7280;
        }

        .balance-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 6px;
          font-size: 12px;
          color: #6b7280;
        }

        .max-btn {
          background: #6366f1;
          color: #ffffff;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }

        .service-fee-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .fee-option {
          background: #1a1a1a;
          border: 1px solid #333333;
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .fee-option:hover {
          border-color: #6366f1;
        }

        .fee-option.active {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.1);
        }

        .fee-option.advanced.active {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.2);
        }

        .fee-option-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .fee-label {
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
        }

        .fee-amount {
          color: #9ca3af;
          font-size: 12px;
        }

        .fee-details {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .fee-percentage {
          background: #6366f1;
          color: #ffffff;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          min-width: 50px;
          text-align: center;
        }

        .fee-value {
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
        }

        .fee-token {
          color: #9ca3af;
          font-size: 14px;
        }

        .fee-input {
          background: transparent;
          border: none;
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          width: 40px;
          outline: none;
          text-align: center;
        }

        .request-button {
          background: #6366f1;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 16px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin: 8px 0 0 0;
        }

        .request-button:hover {
          background: #5855eb;
        }

        .footer {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          color: #6b7280;
          font-size: 14px;
          text-align: center;
          z-index: 2;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .confirm-modal {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 16px;
          padding: 24px;
          width: 90%;
          max-width: 480px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .status-modal {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 16px;
          padding: 32px;
          text-align: center;
          width: 90%;
          max-width: 400px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .modal-header h3 {
          color: #ffffff;
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 20px;
          cursor: pointer;
          padding: 4px;
          margin: 0;
        }

        .close-btn:hover {
          color: #ffffff;
        }

        .confirm-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .detail-label {
          color: #9ca3af;
          font-size: 14px;
        }

        .detail-value {
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .fee-badge {
          background: #6366f1;
          color: #ffffff;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .terms-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
          padding: 16px;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 8px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ffffff;
          font-size: 14px;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          accent-color: #6366f1;
        }

        .confirm-btn {
          width: 100%;
          background: #6366f1;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 16px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin: 0;
        }

        .confirm-btn:hover {
          background: #5855eb;
        }

        .status-modal h3 {
          color: #ffffff;
          font-size: 24px;
          font-weight: 600;
          margin: 0 0 24px 0;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #333;
          border-top: 4px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 24px auto;
        }

        .success-checkmark {
          width: 48px;
          height: 48px;
          background: #10b981;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px auto;
          color: #ffffff;
          font-size: 24px;
          font-weight: bold;
        }

        .status-modal p {
          color: #9ca3af;
          font-size: 16px;
          margin: 0;
        }

        .tx-hash {
          margin-top: 16px;
          padding: 8px;
          background: #262626;
          border-radius: 8px;
          word-break: break-all;
        }

        .tx-hash small {
          color: #9ca3af;
          font-size: 12px;
        }

        .approval-info {
          margin-top: 16px;
          padding: 8px 12px;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 6px;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .approval-info small {
          color: #9ca3af;
          font-size: 12px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .header-section {
            flex-direction: column;
            gap: 16px;
          }

          .chain-selector-row {
            flex-direction: column;
            gap: 12px;
          }

          .receive-address-row {
            flex-direction: column;
            gap: 16px;
          }

          .arrow-container {
            transform: rotate(90deg);
          }

          .form-container {
            padding: 24px;
          }

          .page-title {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  )
}