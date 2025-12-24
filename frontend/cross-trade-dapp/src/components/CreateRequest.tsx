'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId, useSwitchChain, useBalance, useReadContract } from 'wagmi'
import {
  l2_cross_trade_ABI,
  // L2_L2 specific imports
  getChainsFor_L2_L2,
  getTokenAddressFor_L2_L2,
  getContractAddressFor_L2_L2,
  getAvailableTokensFor_L2_L2,
  getDestinationChainsFor_L2_L2,  // NEW: For filtering destination chains
  // L2_L1 specific imports
  getChainsFor_L2_L1,
  getTokenAddressFor_L2_L1,
  getContractAddressFor_L2_L1,
  getAvailableTokensFor_L2_L1,
  getDestinationChainsFor_L2_L1,  // NEW: For filtering destination chains
  // L2_L1 ABIs
  L2_L1_REQUEST_ABI,
} from '@/config/contracts'
import { getTokenLogo, getChainLogo, getExplorerUrl } from '@/utils/chainLogos'
import Link from 'next/link'

// ERC20 ABI for approve and balanceOf functions
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
  },
  {
    "inputs": [
      {"internalType": "address", "name": "account", "type": "address"}
    ],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export const CreateRequest = () => {
  const [requestFrom, setRequestFrom] = useState('')
  const [requestTo, setRequestTo] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [sendToken, setSendToken] = useState('eth') // Default to eth (lowercase to match config)
  const [receiveAmount, setReceiveAmount] = useState('')
  // receiveToken is always the same as sendToken - no separate state needed
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
    const symbol = tokenSymbol.toLowerCase()
    switch (symbol) {
      case 'usdc':
      case 'usdt':
        return 6 // USDC and USDT use 6 decimals
      case 'eth':
      case 'ton':
      default:
        return 18 // ETH and most tokens use 18 decimals
    }
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

  // NEW: Get allowed destination chains for the selected token and source chain
  const getAllowedDestinationChains = (): number[] => {
    if (!requestFrom || !sendToken) return []
    
    const fromChainId = getChainIdByName(requestFrom)
    if (!fromChainId) return []
    
    // Get destination chains from the appropriate config based on communication mode
    let destinationChains: number[] = []
    
    if (communicationMode === 'L2_L2') {
      destinationChains = getDestinationChainsFor_L2_L2(fromChainId, sendToken)
    } else {
      destinationChains = getDestinationChainsFor_L2_L1(fromChainId, sendToken)
    }
    
    // If no destination_chains defined (old format or L1 chain), allow all chains
    return destinationChains
  }

  // Check if a chain is L1 (Ethereum)
  // Known L1 chain IDs: Ethereum Sepolia (11155111) and Ethereum Mainnet (1)
  const isL1Chain = (chainId: number): boolean => {
    return chainId === 11155111 || chainId === 1
  }

  // Check if L2_L1 config is available (not empty)
  const isL2L1ConfigAvailable = (): boolean => {
    const l2l1Chains = getChainsFor_L2_L1()
    return l2l1Chains && l2l1Chains.length > 0
  }

  // Automatically detect communication mode based on destination chain
  // If destination is Ethereum (L1) → L2_L1, otherwise → L2_L2
  const getCommunicationMode = (): 'L2_L2' | 'L2_L1' => {
    // If no destination selected, default to L2_L2
    if (!requestTo) return 'L2_L2'
    
    // Check if destination is L1 (Ethereum)
    const toChainId = getChainIdByName(requestTo)
    if (toChainId && isL1Chain(toChainId)) {
      return 'L2_L1' // L2 source → L1 destination
    }
    
    return 'L2_L2' // L2 source → L2 destination
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


  // Validate that source and destination chains are different
  // Trim whitespace and compare to handle any edge cases
  const isSameChain = !!(requestFrom && requestTo && requestFrom.trim() === requestTo.trim())

  // Auto-reset requestTo if it becomes the same as requestFrom
  useEffect(() => {
    if (requestFrom && requestTo && requestFrom.trim() === requestTo.trim()) {
      setRequestTo('') // Reset to empty to force user to select again
    }
  }, [requestFrom, requestTo])

  // Reset token selection when chain changes
  useEffect(() => {
    // Only update tokens if chains are selected
    if (!requestFrom || !requestTo) return

    const availableSendTokens = getAvailableTokensForMode(requestFrom)

    // Reset send token if current selection is not available
    if (!availableSendTokens.includes(sendToken) && availableSendTokens.length > 0) {
      setSendToken(availableSendTokens[0])
    }
    // resets approval state when chain or token changes (different contract/chain = different approval)
    setIsTokenApproved(false)

    // Note: receiveToken is always the same as sendToken, no need to reset separately
  }, [requestFrom, requestTo, sendToken])

  // NEW: Reset destination chain if it's not in the allowed destinations for the current token
  useEffect(() => {
    if (!requestFrom || !requestTo || !sendToken) return
    
    const allowedDestinations = getAllowedDestinationChains()
    
    // If there are destination restrictions
    if (allowedDestinations && allowedDestinations.length > 0) {
      const toChainId = getChainIdByName(requestTo)
      
      // If current destination is not in allowed list, reset it
      if (toChainId && !allowedDestinations.includes(toChainId)) {
        setRequestTo('')
      }
    }
  }, [requestFrom, sendToken, requestTo])

  // Helper function to convert amount to wei based on token decimals
  const toTokenWei = (amount: string, tokenSymbol: string) => {
    const decimals = getTokenDecimals(tokenSymbol)
    return BigInt(Math.floor(parseFloat(amount || '0') * Math.pow(10, decimals)))
  }

  // Calculate service fee and you receive amount
  //Gets the effective custom fee percentage empty defaults to 2%
  const getCustomFeePercent = (): number => {
    if (customFee === '') return 2
    const parsed = parseFloat(customFee)
    return isNaN(parsed) ? 0 : parsed
  }

  // calc fee based on current mode
  const calculateFee = () => {
    const sendAmountNum = parseFloat(sendAmount)
    if (isNaN(sendAmountNum) || sendAmountNum <= 0) return 0

    if (serviceFeeMode === 'recommended') {
      return sendAmountNum * 0.02
    } else {
      return sendAmountNum * (getCustomFeePercent() / 100)
    }
  }

  // Get fee amount for recommended (2%) this always shows this regardless of mode
  const getRecommendedFeeAmount = (): string => {
    const sendAmountNum = parseFloat(sendAmount)
    if (isNaN(sendAmountNum) || sendAmountNum <= 0) return '0.0000'
    return (sendAmountNum * 0.02).toFixed(4)
  }

  // Get fee amount for custom percentage this always shows this regardless of mode
  const getCustomFeeAmount = (): string => {
    const sendAmountNum = parseFloat(sendAmount)
    if (isNaN(sendAmountNum) || sendAmountNum <= 0) return '0.0000'
    return (sendAmountNum * (getCustomFeePercent() / 100)).toFixed(4)
  }

  const calculateReceiveAmount = () => {
    const sendAmountNum = parseFloat(sendAmount) || 0
    const fee = calculateFee()
    const result = sendAmountNum - fee
    return result > 0 ? result.toFixed(6) : '0' // Show more precision for 6-decimal tokens
  }

  // Update receive amount when send amount or fee changes
  const currentReceiveAmount = calculateReceiveAmount()

  // Get token address for balance checking
  // IMPORTANT: For balance, we need the SOURCE chain's token address
  // We should check BOTH L2_L2 and L2_L1 configs because the source chain
  // might be configured in either one, regardless of the communication mode
  const getSourceTokenAddress = () => {
    // Don't try to get address if no chain is selected
    if (!requestFrom) return undefined
    
    try {
      const fromChainId = getChainIdByName(requestFrom)
      if (!fromChainId) return undefined
      
      // Try L2_L2 config first
      let tokenAddress = getTokenAddressFor_L2_L2(fromChainId, sendToken)
      if (tokenAddress) return tokenAddress
      
      // If not found, try L2_L1 config
      tokenAddress = getTokenAddressFor_L2_L1(fromChainId, sendToken)
      if (tokenAddress) return tokenAddress
      
      return undefined
    } catch {
      return undefined
    }
  }

  const sourceTokenAddress = getSourceTokenAddress()
  const isNativeTokenForBalance = sourceTokenAddress?.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()
  
  // Get chain ID safely for balance fetching
  const sourceChainIdForBalance = requestFrom ? getChainIdByName(requestFrom) : undefined

  // Fetch native token balance (ETH, TON, etc.)
  const { data: nativeBalance } = useBalance({
    address: connectedAddress,
    chainId: sourceChainIdForBalance,
    query: {
      enabled: isNativeTokenForBalance && !!connectedAddress && !!sourceChainIdForBalance
    }
  })

  // Fetch ERC20 token balance
  const { data: erc20Balance } = useReadContract({
    address: sourceTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: connectedAddress ? [connectedAddress] : undefined,
    chainId: sourceChainIdForBalance,
    query: {
      enabled: !isNativeTokenForBalance && !!connectedAddress && !!sourceTokenAddress && !!sourceChainIdForBalance
    }
  })

  // Format balance for display
  const formatBalance = () => {
    if (!connectedAddress) return '0.00'
    
    if (isNativeTokenForBalance && nativeBalance) {
      const decimals = getTokenDecimals(sendToken)
      const balance = Number(nativeBalance.value) / (10 ** decimals)
      return balance.toFixed(6)
    } else if (!isNativeTokenForBalance && erc20Balance) {
      const decimals = getTokenDecimals(sendToken)
      const balance = Number(erc20Balance) / (10 ** decimals)
      return balance.toFixed(6)
    }
    
    return '0.00'
  }

  const displayBalance = formatBalance()

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
      const l2DestinationTokenAddress = getTokenAddressForMode(toChainId, sendToken) // Token on destination chain (same as source)
      
      // Get the CrossTrade contract address (this is the spender) (mode-aware)
      const crossTradeContractAddress = getContractAddressForMode(fromChainId, 'l2_cross_trade')
      
      if (!crossTradeContractAddress) {
        throw new Error(`l2_cross_trade contract address not found for chain ${fromChainId}`)
      }
      
      // Amount calculations with correct decimals
      const totalAmountWei = toTokenWei(sendAmount, sendToken)
      const ctAmountWei = toTokenWei(currentReceiveAmount, sendToken) // Same token as sendToken

      // Connected wallet info
      const connectedWallet = connectedAddress
      const recipientAddress = toAddress


      // Validate that we have the required addresses
      if (!l2SourceTokenAddress || l2SourceTokenAddress === '') {
        throw new Error(`No token address found for ${sendToken} on ${requestFrom} (Chain ID: ${fromChainId})`)
      }
      
      if (!crossTradeContractAddress || crossTradeContractAddress === '') {
        throw new Error('CrossTrade contract address not found')
      }

      if (chainId !== fromChainId) {
        try {
          await switchChain({ chainId: fromChainId })
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (switchError) {
          alert(`Please manually switch to ${requestFrom} network in your wallet`)
          setIsApproving(false)
          setShowConfirmingModal(false)
          return
        }
      }

      await writeApproval({
        address: l2SourceTokenAddress as `0x${string}`, // ERC20 token contract to call approve() on
        abi: ERC20_ABI,
        functionName: 'approve',
        chainId: fromChainId, // Execute on the source chain (e.g., Optimism Sepolia)
        args: [
          crossTradeContractAddress as `0x${string}`, // spender = CrossTrade contract
          totalAmountWei // amount to approve (total send amount)
        ]
      })
    } catch (error) {
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
      const l2DestinationTokenAddress = getTokenAddressForMode(toChainId, sendToken) // L2 destination token (to chain, same as source)

      // Get contract address for the current chain (mode-aware)
      const contractAddress = getContractAddressForMode(fromChainId, 'l2_cross_trade')
      
      if (!contractAddress) {
        throw new Error(`l2_cross_trade contract address not found for chain ${fromChainId}`)
      }

      if (chainId !== fromChainId) {
        try {
          await switchChain({ chainId: fromChainId })
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (switchError) {
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
        const l1ChainId = 11155111
        const l1TokenAddress = getTokenAddressForMode(l1ChainId, sendToken)
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
            toTokenWei(currentReceiveAmount, sendToken), // ctAmount with correct decimals (same token)
            BigInt(l1ChainId), // l1ChainId (Ethereum Sepolia for L2_L2)
            BigInt(toChainId) // l2DestinationChainId
          ],
          value: isNativeToken ? toTokenWei(sendAmount, sendToken) : BigInt(0)
        })
      } else {
        const l1ChainId = 11155111
        const l1TokenAddress = getTokenAddressForMode(l1ChainId, sendToken)
        const isNativeTokenL2L1 = l2SourceTokenAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()

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
            toTokenWei(currentReceiveAmount, sendToken), // _ctAmount with correct decimals (same token)
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

  // Debug: Log transaction state changes
  useEffect(() => {
    console.log('🔄 Transaction state:', { hash, isConfirming, isSuccess, txError: !!txError, writeError: !!writeError })
  }, [hash, isConfirming, isSuccess, txError, writeError])

  // Handle main transaction states
  useEffect(() => {
    if (isSuccess) {
      console.log('✅ Transaction confirmed! Hash:', hash)
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
  }, [isSuccess, txError, writeError, hash])

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
          <span className="mode-badge" style={{
            color: communicationMode === 'L2_L2' ? '#818cf8' : '#4ade80'
          }}>
            {communicationMode === 'L2_L2' ? 'L2 ↔ L2' : 'L2 → L1'}
          </span>
          <a href="/request-pool" className="request-pool-button">
            Request Pool
          </a>
        </div>

        <form onSubmit={handleSubmit} className="request-form">
          {/* Card 1: Chain & Amount */}
          <div className="form-card">
            {/* Request From/To Section - Superbridge Style */}
            <div className="chain-selector-row">
              <label className="chain-box">
                <Image
                  src={getChainLogo(requestFrom)}
                  alt={requestFrom || 'chain'}
                  width={36}
                  height={36}
                  style={{ borderRadius: '10px', flexShrink: 0 }}
                />
                <div className="chain-info">
                  <span className="chain-label">From</span>
                  <span className="chain-name">{requestFrom || 'Select chain'}</span>
                </div>
                <select
                  value={requestFrom}
                  onChange={(e) => setRequestFrom(e.target.value)}
                  className="chain-select-hidden"
                >
                  <option value="" disabled>Select chain</option>
                  {[...getChainsFor_L2_L2(), ...getChainsFor_L2_L1()]
                    .filter((chain, index, self) =>
                      index === self.findIndex(c => c.chainId === chain.chainId)
                    )
                    .filter(({ chainId }) => !isL1Chain(chainId))
                    .map(({ chainId, config }) => (
                      <option key={chainId} value={config.display_name}>
                        {config.display_name}
                      </option>
                    ))
                  }
                </select>
              </label>

              <svg
                className="swap-icon"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="#6b7280"
                onClick={() => {
                  if (requestFrom && requestTo) {
                    const temp = requestFrom
                    setRequestFrom(requestTo)
                    setRequestTo(temp)
                  }
                }}
              >
                <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/>
              </svg>

              <label className="chain-box">
                <div className="chain-info" style={{ alignItems: 'flex-end' }}>
                  <span className="chain-label">To</span>
                  <span className="chain-name">{requestTo || 'Select chain'}</span>
                </div>
                <Image
                  src={getChainLogo(requestTo)}
                  alt={requestTo || 'chain'}
                  width={36}
                  height={36}
                  style={{ borderRadius: '10px', flexShrink: 0 }}
                />
                <select
                  value={requestTo}
                  onChange={(e) => setRequestTo(e.target.value)}
                  className="chain-select-hidden"
                >
                  <option value="" disabled>Select chain</option>
                  {(() => {
                    const allowedDestinations = getAllowedDestinationChains()
                    return [...getChainsFor_L2_L2(), ...getChainsFor_L2_L1()]
                      .filter((chain, index, self) =>
                        index === self.findIndex(c => c.chainId === chain.chainId)
                      )
                      .filter(({ config }) => config.display_name !== requestFrom)
                      .filter(({ chainId }) => {
                        if (isL1Chain(chainId) && !isL2L1ConfigAvailable()) {
                          return false
                        }
                        return true
                      })
                      .filter(({ chainId }) => {
                        if (!allowedDestinations || allowedDestinations.length === 0) {
                          return true
                        }
                        return allowedDestinations.includes(chainId)
                      })
                      .map(({ chainId, config }) => (
                        <option key={chainId} value={config.display_name}>
                          {config.display_name}
                        </option>
                      ))
                  })()}
                </select>
              </label>
            </div>

            {/* You Send Section */}
            <div className="amount-section">
              <span className="amount-label">You Send</span>
              <div className="amount-input-container">
                <input
                  type="text"
                  inputMode="decimal"
                  value={sendAmount}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setSendAmount(val)
                    }
                  }}
                  placeholder="0.00"
                  className="amount-input"
                />
                <label className="token-pill">
                  <Image src={getTokenLogo(sendToken)} alt={sendToken} width={22} height={22} style={{ borderRadius: '50%' }} />
                  <span className="token-name">{sendToken}</span>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <select
                    value={sendToken}
                    onChange={(e) => setSendToken(e.target.value)}
                    className="token-select-hidden"
                  >
                    {getAvailableTokensForMode(requestFrom).map((token) => (
                      <option key={token} value={token}>
                        {token}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="balance-row">
                <span className="balance-text">Balance: {displayBalance} {sendToken}</span>
                <span
                  className="max-link"
                  onClick={() => {
                    if (displayBalance && displayBalance !== '0.00') {
                      setSendAmount(displayBalance)
                    }
                  }}
                >
                  Max
                </span>
              </div>
            </div>

            {/* To Address */}
            <div className="address-section">
              <span className="amount-label">To address</span>
              <input
                type="text"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="0x0000000000000000000000000000000000000000"
                className="address-input"
              />
            </div>
          </div>

          {/* Card 2: You Receive (Preview) */}
          <div className="form-card">
            <div className="receive-section">
              <span className="receive-label">You receive</span>
              <div className="receive-row">
                <span className="receive-amount">{currentReceiveAmount || '0.00'}</span>
                <div className="receive-token">
                  <Image src={getTokenLogo(sendToken)} alt={sendToken} width={28} height={28} style={{ borderRadius: '50%' }} />
                  <span className="receive-token-name">{sendToken}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Service Fee */}
          <div className="form-card">
            <div className="fee-section">
              <div className="fee-header">
                <span className="fee-label">Provider Reward</span>
                <span className="fee-hint">Higher fee = faster fulfillment</span>
              </div>
              <div className="fee-options">
                <div
                  className={`fee-opt ${serviceFeeMode === 'recommended' ? 'active' : ''}`}
                  onClick={() => setServiceFeeMode('recommended')}
                >
                  <span className="fee-name">Standard <span className="fee-tag">Recommended</span></span>
                  <span className="fee-val">2% <span className="fee-amt">{getRecommendedFeeAmount()} {sendToken}</span></span>
                </div>
                <div
                  className={`fee-opt ${serviceFeeMode === 'advanced' ? 'active' : ''}`}
                  onClick={(e) => {
                    setServiceFeeMode('advanced')
                    const input = e.currentTarget.querySelector('input')
                    if (input) setTimeout(() => input.focus(), 0)
                  }}
                >
                  <span className="fee-name">Custom</span>
                  <div className="fee-val">
                    <div className="fee-input">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={customFee}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            const num = parseFloat(val)
                            if (val === '' || (num >= 0 && num <= 100)) {
                              setCustomFee(val)
                            }
                          }
                        }}
                        placeholder="2"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span>%</span>
                    </div>
                    <span className="fee-amt">{getCustomFeeAmount()} {sendToken}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Request/Connect Button */}
          <button 
              type={connectedAddress ? "submit" : "button"} 
              className="request-button"
              disabled={connectedAddress && (!requestFrom || !requestTo || isSameChain)}
              onClick={connectedAddress ? undefined : () => {
                // Trigger AppKit modal programmatically
                const appkitButton = document.querySelector('appkit-button') as any;
                if (appkitButton) appkitButton.click();
              }}
              style={{ 
                opacity: connectedAddress && (!requestFrom || !requestTo || isSameChain) ? 0.5 : 1,
                cursor: connectedAddress && (!requestFrom || !requestTo || isSameChain) ? 'not-allowed' : 'pointer'
              }}
            >
              {!connectedAddress 
                ? "Please Connect Wallet" 
                : !requestFrom || !requestTo 
                  ? "Select chains to continue"
                  : isSameChain
                    ? "Cannot transfer to the same chain"
                    : "Request"}
          </button>
        </form>

        {/* Hidden AppKit button for programmatic wallet connection */}
        <appkit-button style={{ display: 'none' }} />

      </div>
      
      <footer className="footer">
        © 2026 All rights reserved.
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
                <span className="detail-value">
                  <Image src={getChainLogo(requestFrom)} alt={requestFrom} width={16} height={16} style={{ borderRadius: '50%', verticalAlign: 'middle', marginRight: '6px' }} />
                  {requestFrom}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">To</span>
                <span className="detail-value">
                  <Image src={getChainLogo(requestTo)} alt={requestTo} width={16} height={16} style={{ borderRadius: '50%', verticalAlign: 'middle', marginRight: '6px' }} />
                  {requestTo}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Send</span>
                <span className="detail-value">
                  {sendAmount} <Image src={getTokenLogo(sendToken)} alt={sendToken} width={16} height={16} style={{ borderRadius: '50%', verticalAlign: 'middle' }} /> {sendToken}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Receive</span>
                <span className="detail-value">
                  {currentReceiveAmount} <Image src={getTokenLogo(sendToken)} alt={sendToken} width={16} height={16} style={{ borderRadius: '50%', verticalAlign: 'middle' }} /> {sendToken.toUpperCase()}
                </span>
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
                <span className="detail-label">Service fee</span>
                <span className="detail-value">
                  <span className="fee-badge-modal">{serviceFeeMode === 'recommended' ? '2.00%' : getCustomFeePercent().toFixed(2) + '%'}</span>
                  {calculateFee().toFixed(6)} {sendToken.toUpperCase()}
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
          <div className="success-modal">
            <button onClick={() => setShowSuccessModal(false)} className="success-close-btn" aria-label="Close">
              <svg viewBox="0 0 12 12" fill="none">
                <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Animated Success Icon */}
            <div className="success-glow-container">
              <div className="success-glow"></div>
              <div className="success-check-circle">
                <svg className="success-check-svg" width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path className="check-path" d="M4 12L9 17L20 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <h3 className="success-heading">Request Live</h3>

            {/* Chain Flow */}
            <div className="chain-flow">
              <Image src={getChainLogo(requestFrom)} alt={requestFrom} width={22} height={22} style={{ borderRadius: '50%' }} />
              <span className="chain-name">{requestFrom}</span>
              <span className="flow-arrow">→</span>
              <Image src={getChainLogo(requestTo)} alt={requestTo} width={22} height={22} style={{ borderRadius: '50%' }} />
              <span className="chain-name">{requestTo}</span>
            </div>

            <p className="success-message">
              <span className="status-dot"></span>
              Awaiting provider fulfillment
            </p>

            {hash && (
              <a
                href={getExplorerUrl(chainId, hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-hash-link"
              >
                <span>{hash.slice(0, 14)}...{hash.slice(-12)}</span>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M10 2L2 10M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            )}

            <Link
              href="/request-pool"
              onClick={() => setShowSuccessModal(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '14px 20px',
                background: '#6366f1',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              View in Request Pool
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
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
          padding: 40px 20px;
        }

        .header-section {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .page-title {
          color: #ffffff;
          font-size: 26px;
          font-weight: 600;
          margin: 0;
        }

        .mode-badge {
          font-size: 13px;
          font-weight: 600;
          color: #a5b4fc;
          background: rgba(99, 102, 241, 0.1);
          padding: 6px 12px;
          border-radius: 20px;
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

        .request-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          max-width: 480px;
        }

        .form-card {
          background: linear-gradient(145deg, #161618 0%, #111113 100%);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 24px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .chain-selector-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .chain-box {
          flex: 1;
          min-width: 0;
          background: #1f1f23;
          border-radius: 16px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          position: relative;
        }

        .chain-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
          flex: 1;
        }

        .chain-label {
          color: #6b7280;
          font-size: 13px;
          font-weight: 400;
        }

        .chain-name {
          color: #ffffff;
          font-size: 16px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
        }

        .chain-select-hidden {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .swap-icon {
          flex-shrink: 0;
          cursor: pointer;
        }

        .amount-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .amount-label {
          color: #9ca3af;
          font-size: 14px;
          font-weight: 500;
        }

        .balance-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 2px;
        }

        .balance-text {
          color: #6b7280;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-feature-settings: 'tnum' on, 'lnum' on;
        }

        .max-link {
          color: #818cf8;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        .max-link:hover {
          color: #a5b4fc;
        }

        .receive-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .receive-label {
          color: #9ca3af;
          font-size: 13px;
          font-weight: 500;
        }

        .receive-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .receive-amount {
          color: #ffffff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 26px;
          font-weight: 600;
          font-feature-settings: 'tnum' on, 'lnum' on;
        }

        .receive-token {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .receive-token-name {
          color: #ffffff;
          font-size: 18px;
          font-weight: 600;
        }

        .amount-input-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #1f1f23;
          border-radius: 10px 32px 32px 10px;
          padding: 12px;
          gap: 12px;
        }

        .amount-input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 0;
          color: #ffffff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 26px;
          font-weight: 500;
          font-feature-settings: 'tnum' on, 'lnum' on;
          outline: none;
          min-width: 0;
        }

        .amount-input::placeholder {
          color: #4b5563;
        }

        .token-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #2d2d32;
          border-radius: 24px;
          cursor: pointer;
          position: relative;
          flex-shrink: 0;
        }

        .token-pill:hover {
          background: #38383e;
        }

        .token-name {
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
        }

        .token-select-hidden {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .address-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .address-input {
          width: 100%;
          background: #1f1f23;
          border: none;
          border-radius: 10px;
          padding: 14px 16px;
          color: #ffffff;
          font-size: 14px;
          font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          outline: none;
          box-sizing: border-box;
        }

        .address-input:focus {
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
        }

        .address-input::placeholder {
          color: #4b5563;
        }


        .fee-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .fee-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .fee-label {
          color: #9ca3af;
          font-size: 13px;
          font-weight: 500;
        }

        .fee-hint {
          color: #52525b;
          font-size: 11px;
        }

        .fee-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .fee-opt {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 12px;
          padding: 14px 16px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .fee-opt:hover {
          border-color: #3f3f46;
        }

        .fee-opt.active {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.06);
        }

        .fee-name {
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .fee-tag {
          color: #4ade80;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .fee-val {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #ffffff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 16px;
          font-weight: 600;
        }

        .fee-amt {
          color: #71717a;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 500;
        }

        .fee-input {
          display: flex;
          align-items: center;
          background: #0a0a0b;
          border: 1px solid #27272a;
          border-radius: 8px;
          padding: 6px 10px;
        }

        .fee-opt.active .fee-input {
          border-color: #3f3f46;
        }

        .fee-input input {
          background: transparent;
          border: none;
          color: #ffffff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 15px;
          font-weight: 600;
          width: 36px;
          outline: none;
          text-align: right;
        }

        .fee-input input::placeholder {
          color: #3f3f46;
        }

        .fee-input span {
          color: #71717a;
          font-size: 14px;
        }

        .request-button {
          width: 100%;
          box-sizing: border-box;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #ffffff;
          border: none;
          border-radius: 16px;
          padding: 18px 0;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin: 8px 0 0 0;
        }

        .request-button:hover {
          background: linear-gradient(135deg, #7c7ff5 0%, #6366f1 100%);
        }

        .request-button:active {
          background: linear-gradient(135deg, #5558e8 0%, #4338ca 100%);
        }

        .request-button:disabled {
          background: #27272a;
          cursor: not-allowed;
          opacity: 0.5;
        }

        .footer {
          margin-top: 40px;
          color: #52525b;
          font-size: 12px;
          text-align: center;
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

        .fee-badge-modal {
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
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #ffffff;
          border: none;
          border-radius: 14px;
          padding: 16px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          margin: 0;
          box-shadow:
            0 4px 16px rgba(99, 102, 241, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .confirm-btn:hover {
          background: linear-gradient(135deg, #7c7ff5 0%, #6366f1 100%);
          transform: translateY(-1px);
          box-shadow:
            0 6px 24px rgba(99, 102, 241, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        .confirm-btn:disabled {
          background: linear-gradient(135deg, #3f3f46 0%, #27272a 100%);
          box-shadow: none;
          cursor: not-allowed;
          opacity: 0.6;
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

        .status-modal p {
          color: #9ca3af;
          font-size: 16px;
          margin: 0;
        }

        /* Success Modal */
        .success-modal {
          background: #0d0d0d;
          border-radius: 16px;
          padding: 32px 28px 28px;
          width: 100%;
          max-width: 360px;
          text-align: center;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
        }

        .success-close-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: transparent;
          border: none;
          color: #ffffff;
          padding: 4px;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }
        .success-close-btn:hover {
          opacity: 1;
        }
        .success-close-btn svg {
          width: 18px;
          height: 18px;
        }

        /* Animated Success Icon with Glow */
        .success-glow-container {
          position: relative;
          width: 64px;
          height: 64px;
          margin: 0 auto 20px;
        }

        .success-glow {
          position: absolute;
          inset: -8px;
          background: radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, transparent 70%);
          border-radius: 50%;
          animation: glow-pulse 2.5s ease-in-out infinite;
        }

        .success-check-circle {
          position: absolute;
          inset: 0;
          background: linear-gradient(145deg, #22c55e 0%, #16a34a 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 8px 24px rgba(34, 197, 94, 0.35);
        }

        .check-path {
          stroke-dasharray: 30;
          stroke-dashoffset: 30;
          animation: draw-check 0.5s ease forwards 0.2s;
        }

        @keyframes draw-check {
          to { stroke-dashoffset: 0; }
        }

        @keyframes glow-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }

        .success-heading {
          color: #ffffff;
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 20px 0;
          letter-spacing: -0.01em;
        }

        /* Chain Flow */
        .chain-flow {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .flow-arrow {
          color: #6b7280;
          font-size: 16px;
          margin: 0 4px;
        }

        .success-message {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #9ca3af;
          font-size: 13px;
          margin: 0 0 20px 0;
          font-weight: 400;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          background: #22c55e;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .tx-hash-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          color: #9ca3af;
          font-size: 13px;
          font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
          text-decoration: none;
          margin-bottom: 20px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .tx-hash-link:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }

        .success-modal .pool-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 20px;
          background: #6366f1;
          color: white !important;
          font-size: 14px;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
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

          .page-title {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  )
}