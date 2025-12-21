'use client'

import React, { useState, useMemo } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId, useSwitchChain, useReadContract } from 'wagmi'
import Image from 'next/image'
import {
  PROVIDE_CT_ABI,
  CHAIN_CONFIG_L2_L2,
  CHAIN_CONFIG_L2_L1,
  getTokenDecimals,
  // L2_L2 specific imports
  getContractAddressFor_L2_L2,
  // L2_L1 specific imports
  getContractAddressFor_L2_L1,
  L2_L1_PROVIDE_CT_ABI
} from '@/config/contracts'
import { getChainLogo, getExplorerUrl } from '@/utils/chainLogos'

// ERC20 ABI for approve and allowance functions
const ERC20_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

interface ReviewProvideModalProps {
  isOpen: boolean
  onClose: () => void
  requestData: {
    saleCount: number
    chainId: number
    chainName: string
    l1token: string
    l2SourceToken: string
    l2DestinationToken: string
    requester: string
    receiver: string
    totalAmount: bigint
    ctAmount: bigint
    editedCtAmount?: bigint
    l1ChainId: bigint
    l2DestinationChainId: bigint
    hashValue: string
  }
}

export const ReviewProvideModal = ({ isOpen, onClose, requestData }: ReviewProvideModalProps) => {
  const [riskUnderstood, setRiskUnderstood] = useState(false)
  const [approvalStep, setApprovalStep] = useState<'checking' | 'needed' | 'approving' | 'approved'>('checking')
  const [isApprovalSuccess, setIsApprovalSuccess] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  
  // Wagmi hooks for contract interaction
  const { writeContract, isPending, data: hash, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({
    hash,
  })
  
  // Separate hooks for approval transaction
  const { writeContract: writeApprovalContract, isPending: isApprovalPending, data: approvalHash, error: approvalWriteError } = useWriteContract()
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalTxSuccess, error: approvalReceiptError } = useWaitForTransactionReceipt({
    hash: approvalHash,
  })
  
  // Wallet connection hooks
  const { address, isConnected, chain } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  // Detect communication mode based on destination chain
  const communicationMode = useMemo((): 'L2_L2' | 'L2_L1' => {
    const destinationChainId = Number(requestData.l2DestinationChainId)
    const l1ChainId = 11155111 // Ethereum Sepolia
    
    // If destination is Ethereum (L1) → L2_L1, otherwise → L2_L2
    return destinationChainId === l1ChainId ? 'L2_L1' : 'L2_L2'
  }, [requestData.l2DestinationChainId])

  // Get the correct ABI based on communication mode
  const getProvideABI = () => {
    return communicationMode === 'L2_L1' ? L2_L1_PROVIDE_CT_ABI : PROVIDE_CT_ABI
  }

  // Get L1 contract address using mode-aware configuration
  const l1ChainId = Number(requestData.l1ChainId)
  const getL1ContractAddress = () => {
    if (communicationMode === 'L2_L1') {
      return getContractAddressFor_L2_L1(l1ChainId, 'l1_cross_trade')
    } else {
      return getContractAddressFor_L2_L2(l1ChainId, 'l1_cross_trade')
    }
  }
  const L1_CONTRACT_ADDRESS = getL1ContractAddress()

  console.log('🔵 ReviewProvideModal - Mode detection:', {
    mode: communicationMode,
    destinationChainId: requestData.l2DestinationChainId.toString(),
    l1ContractAddress: L1_CONTRACT_ADDRESS,
    abi: communicationMode === 'L2_L1' ? 'L2_L1_PROVIDE_CT_ABI' : 'PROVIDE_CT_ABI'
  })
  
  // Check if it's an ETH transaction
  const isETH = requestData.l1token === '0x0000000000000000000000000000000000000000'
  
  // Check current allowance for ERC20 tokens
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: isETH ? undefined : requestData.l1token as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: isETH || !address || !L1_CONTRACT_ADDRESS ? undefined : [address, L1_CONTRACT_ADDRESS as `0x${string}`],
    chainId: l1ChainId,
    query: {
      enabled: !isETH && !!address && !!L1_CONTRACT_ADDRESS
    }
  })

  // Use editedCtAmount from requestData (already fetched in RequestPool/History)
  const editedCtAmount = requestData.editedCtAmount

  if (!isOpen) return null
  

  // Helper function to format token amounts with proper decimals
  const formatTokenAmount = (amount: bigint, tokenAddress: string) => {
    let symbol = 'UNKNOWN'
    let decimals = 18

    // Check against known token addresses from both L2_L2 and L2_L1 configs
    Object.entries(CHAIN_CONFIG_L2_L2).forEach(([chainId, config]) => {
      // Handle both NEW array format and OLD object format
      if (Array.isArray(config.tokens)) {
        // NEW format: array of TokenWithDestinations
        config.tokens.forEach(token => {
          if (token.address && token.address.toLowerCase() === tokenAddress.toLowerCase()) {
            symbol = token.name.toUpperCase()
            decimals = getTokenDecimals(token.name)
          }
        })
      } else {
        // OLD format: object with key-value pairs
        Object.entries(config.tokens).forEach(([tokenSymbol, address]) => {
          if (address && address.toLowerCase() === tokenAddress.toLowerCase()) {
            symbol = tokenSymbol
            decimals = getTokenDecimals(tokenSymbol)
          }
        })
      }
    })
    
    // Also check L2_L1 config if not found
    if (symbol === 'UNKNOWN') {
      Object.entries(CHAIN_CONFIG_L2_L1).forEach(([chainId, config]) => {
        // Handle both NEW array format and OLD object format
        if (Array.isArray(config.tokens)) {
          // NEW format: array of TokenWithDestinations
          config.tokens.forEach(token => {
            if (token.address && token.address.toLowerCase() === tokenAddress.toLowerCase()) {
              symbol = token.name.toUpperCase()
              decimals = getTokenDecimals(token.name)
            }
          })
        } else {
          // OLD format: object with key-value pairs
          Object.entries(config.tokens).forEach(([tokenSymbol, address]) => {
            if (address && address.toLowerCase() === tokenAddress.toLowerCase()) {
              symbol = tokenSymbol
              decimals = getTokenDecimals(tokenSymbol)
            }
          })
        }
      })
    }

    const divisor = BigInt(10 ** decimals)
    const integerPart = amount / divisor
    const fractionalPart = amount % divisor
    
    if (fractionalPart === BigInt(0)) {
      return `${integerPart.toString()}`
    } else {
      const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
      const trimmedFractional = fractionalStr.replace(/0+$/, '')
      return `${integerPart.toString()}.${trimmedFractional}`
    }
  }

  // Helper function to get chain name from chain ID
  const getChainName = (chainId: bigint) => {
    const chainIdNum = Number(chainId)
    const chainIdStr = chainIdNum.toString()
    // Try L2_L2 config first, then L2_L1
    const config = CHAIN_CONFIG_L2_L2[chainIdStr] || CHAIN_CONFIG_L2_L1[chainIdStr]
    return config?.name || `Chain ${chainId}`
  }

  // Helper function to render chain icon as image
  const renderChainIcon = (chainName: string) => {
    const logoSrc = getChainLogo(chainName)
    return (
      <Image
        src={logoSrc}
        alt={chainName}
        width={20}
        height={20}
        style={{ borderRadius: '50%', objectFit: 'cover' }}
      />
    )
  }

  // Helper function to get token symbol from address
  const getTokenSymbol = (tokenAddress: string) => {
    let symbol = 'UNKNOWN'
    // Check L2_L2 config
    Object.entries(CHAIN_CONFIG_L2_L2).forEach(([chainId, config]) => {
      // Handle both NEW array format and OLD object format
      if (Array.isArray(config.tokens)) {
        // NEW format: array of TokenWithDestinations
        config.tokens.forEach(token => {
          if (token.address && token.address.toLowerCase() === tokenAddress.toLowerCase()) {
            symbol = token.name.toUpperCase()
          }
        })
      } else {
        // OLD format: object with key-value pairs
        Object.entries(config.tokens).forEach(([tokenSymbol, address]) => {
          if (address && address.toLowerCase() === tokenAddress.toLowerCase()) {
            symbol = tokenSymbol
          }
        })
      }
    })
    // Also check L2_L1 config if not found
    if (symbol === 'UNKNOWN') {
      Object.entries(CHAIN_CONFIG_L2_L1).forEach(([chainId, config]) => {
        // Handle both NEW array format and OLD object format
        if (Array.isArray(config.tokens)) {
          // NEW format: array of TokenWithDestinations
          config.tokens.forEach(token => {
            if (token.address && token.address.toLowerCase() === tokenAddress.toLowerCase()) {
              symbol = token.name.toUpperCase()
            }
          })
        } else {
          // OLD format: object with key-value pairs
          Object.entries(config.tokens).forEach(([tokenSymbol, address]) => {
            if (address && address.toLowerCase() === tokenAddress.toLowerCase()) {
              symbol = tokenSymbol
            }
          })
        }
      })
    }
    return symbol
  }

  // Determine the actual ctAmount to use (edited if available, otherwise original)
  const actualCtAmount = useMemo(() => {
    if (editedCtAmount !== undefined && editedCtAmount > BigInt(0)) {
      console.log('📝 Using edited ctAmount:', editedCtAmount.toString())
      return editedCtAmount
    }
    return requestData.ctAmount
  }, [editedCtAmount, requestData.ctAmount])

  const provideAmount = formatTokenAmount(actualCtAmount, requestData.l2SourceToken)
  const rewardAmount = formatTokenAmount(requestData.totalAmount, requestData.l2SourceToken)
  const provideChain = getChainName(BigInt(11155111)) // Always Ethereum for L1
  const rewardChain = requestData.chainName // Provider gets reward on SOURCE chain (where request originated)
  const sourceChain = requestData.chainName // Source chain from request data
  const tokenSymbol = getTokenSymbol(requestData.l2SourceToken)

  // Calculate profit percentage (what provider gains as % of what they sent)
  const profitPercentage = actualCtAmount > BigInt(0)
    ? Number(((requestData.totalAmount - actualCtAmount) * BigInt(10000)) / actualCtAmount) / 100
    : 0

  // Calculate cross chain path - source chain to destination chain
  const crossChainPath = `${sourceChain} → ${getChainName(requestData.l2DestinationChainId)}`
  const sendToAddress = requestData.receiver.slice(0, 6) + '...' + requestData.receiver.slice(-4)
  
  // Check approval status - use actualCtAmount (edited if available)
  const needsApproval = !isETH && currentAllowance !== undefined && currentAllowance < actualCtAmount && !isApprovalSuccess
  
  // Auto-transition to approved state when approval transaction succeeds
  React.useEffect(() => {
    if (isApprovalTxSuccess && approvalStep === 'approving') {
      setApprovalStep('approved')
      setIsApprovalSuccess(true)
      // Refetch allowance after successful approval
      setTimeout(() => {
        refetchAllowance()
      }, 1000)
    }
  }, [isApprovalTxSuccess, approvalStep, refetchAllowance])

  // Handle main transaction success
  React.useEffect(() => {
    if (isSuccess) {
      setShowSuccessModal(true)
    }
  }, [isSuccess])
  
  // Handle approval function
  const handleApproval = async () => {
    if (isETH) return // No approval needed for ETH
    
    if (!isConnected) {
      alert('Please connect your wallet first!')
      return
    }
    
    // Force switch to L1 chain (Ethereum Sepolia) before approval
    if (chainId !== l1ChainId) {
      try {
        await switchChain({ chainId: l1ChainId })
        // Wait a moment for the network switch to complete
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error('❌ Failed to switch network:', error)
        alert(`Please manually switch to Ethereum Sepolia (Chain ID: ${l1ChainId}) in your wallet`)
        return
      }
    }
    
    setApprovalStep('approving')
    
    try {
      await writeApprovalContract({
        address: requestData.l1token as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        chainId: l1ChainId,
        args: [L1_CONTRACT_ADDRESS as `0x${string}`, actualCtAmount]
      })
      
    } catch (error) {
      console.error('❌ Approval failed:', error)
      setApprovalStep('needed')
      alert(`Approval failed: ${(error as any)?.message || 'Unknown error'}`)
    }
  }
  
  // Handle provide CT function
  const handleProvideCT = async () => {
    
    if (!riskUnderstood) {
      return
    }
    
    if (!L1_CONTRACT_ADDRESS) {
      return
    }
    
    if (!isConnected) {
      alert('Please connect your wallet first!')
      return
    }
    
    if (chainId !== l1ChainId) {
      try {
        await switchChain({ chainId: l1ChainId })
        // Wait a moment for the network switch to complete
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error('❌ Failed to switch network:', error)
        alert(`Please manually switch to Ethereum Sepolia (Chain ID: ${l1ChainId}) in your wallet`)
        return
      }
    }
    
    // Check if approval is needed for ERC20 tokens
    if (!isETH && needsApproval) {
      alert('Please approve the token spending first!')
      return
    }
    
    
    // Use the editedCtAmount from requestData (0 means not edited, >0 means edited)
    const finalEditedCtAmount = editedCtAmount || BigInt(0)
    
    // Use mode-aware ABI and arguments
    const provideABI = getProvideABI()
    const txValue = isETH ? actualCtAmount : BigInt(0)
    
    // Build arguments based on communication mode
    let contractArgs: any
    
    if (communicationMode === 'L2_L2') {
      // NEW contract (L2toL2CrossTradeL1.sol) - 13 params
      // Note: We pass the ORIGINAL ctAmount from L2, and the contract will check editedCtAmount internally
      contractArgs = [
        requestData.l1token as `0x${string}`,
        requestData.l2SourceToken as `0x${string}`,
        requestData.l2DestinationToken as `0x${string}`,
        requestData.requester as `0x${string}`,
        requestData.receiver as `0x${string}`,
        requestData.totalAmount,
        requestData.ctAmount, // Original ctAmount from L2
        finalEditedCtAmount, // _editedctAmount - contract will use this if > 0
        BigInt(requestData.saleCount),
        BigInt(requestData.chainId), // _l2SourceChainId
        requestData.l2DestinationChainId, // _l2DestinationChainId
        200000, // _minGasLimit
        requestData.hashValue as `0x${string}`
      ] as const
    } else {
      // OLD contract (L1CrossTrade.sol) - 11 params
      // Note: We pass the ORIGINAL ctAmount from L2, and the contract will check editedCtAmount internally
      contractArgs = [
        requestData.l1token as `0x${string}`,
        requestData.l2SourceToken as `0x${string}`, // Used as _l2token in OLD contract
        requestData.requester as `0x${string}`,
        requestData.receiver as `0x${string}`,
        requestData.totalAmount,
        requestData.ctAmount, // Original ctAmount from L2
        finalEditedCtAmount, // _editedctAmount - contract will use this if > 0
        BigInt(requestData.saleCount),
        BigInt(requestData.chainId), // _l2chainId (source chain in OLD contract)
        200000, // _minGasLimit
        requestData.hashValue as `0x${string}`
      ] as const
    }
    
    console.log('🔵 ReviewProvideModal - Provide CT:', {
      mode: communicationMode,
      abi: communicationMode === 'L2_L1' ? 'L2_L1_PROVIDE_CT_ABI (11 params)' : 'PROVIDE_CT_ABI (13 params)',
      l1ContractAddress: L1_CONTRACT_ADDRESS,
      saleCount: requestData.saleCount,
      sourceChainId: requestData.chainId,
      destinationChainId: requestData.l2DestinationChainId.toString(),
      argsCount: contractArgs.length,
      amounts: {
        totalAmount: requestData.totalAmount.toString(),
        initialctAmount: requestData.ctAmount.toString(),
        editedctAmount: finalEditedCtAmount.toString(),
        actualAmountToSend: actualCtAmount.toString(),
        isEdited: finalEditedCtAmount > BigInt(0)
      }
    })
    
    try {
      
      const result = await writeContract({
        address: L1_CONTRACT_ADDRESS as `0x${string}`,
        abi: provideABI,
        functionName: 'provideCT',
        chainId: l1ChainId, // Use L1 chain ID from request data
        value: txValue,
        args: contractArgs
      })
    } catch (error) {
      
      // Show user-friendly error message
      if ((error as any)?.message?.includes('User rejected')) {
        alert('Transaction was rejected by user')
      } else if ((error as any)?.message?.includes('insufficient funds')) {
        alert('Insufficient funds for transaction')
      } else {
        alert(`Transaction failed: ${(error as any)?.message || 'Unknown error'}`)
      }
    }
  }
  
  // Network fee calculation (example)
  const networkFee = '0.0012 ETH'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="review-provide-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Review Provide</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="provide-details">
          {/* Mode Indicator */}
          <div style={{ 
            padding: '10px 12px', 
            marginBottom: '12px', 
            borderRadius: '8px', 
            backgroundColor: communicationMode === 'L2_L2' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            border: `1px solid ${communicationMode === 'L2_L2' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>
              {communicationMode === 'L2_L2' ? '🔄 L2 ↔ L2 Mode' : '🌉 L2 ↔ L1 Mode'}
            </span>
            <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)' }}>
              {communicationMode === 'L2_L2' 
                ? 'Using L2_L2 provide contract' 
                : 'Using L2_L1 provide contract'}
            </span>
          </div>

          {/* Provide Chain Section */}
          <div className="chain-section">
            <div className="section-header">
              <span className="section-label">Provide Chain</span>
              <span className="help-icon">ⓘ</span>
            </div>
            <div className="amount-display">
              <span className="amount-value">{provideAmount} {tokenSymbol}</span>
              <div className="chain-badge">
                <span className="chain-icon">{renderChainIcon(provideChain)}</span>
              </div>
            </div>
            <div className="chain-name-display">{provideChain}</div>
            {actualCtAmount !== requestData.ctAmount && (
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                Original: {formatTokenAmount(requestData.ctAmount, requestData.l2SourceToken)} {tokenSymbol}
              </div>
            )}
          </div>

          {/* Reward Chain Section */}
          <div className="chain-section">
            <div className="section-header">
              <span className="section-label">Reward Chain</span>
              <span className="help-icon">ⓘ</span>
            </div>
            <div className="amount-display">
              <span className="amount-value">{rewardAmount} {tokenSymbol}</span>
              <div className="chain-badge">
                <span className="chain-icon">{renderChainIcon(rewardChain)}</span>
              </div>
            </div>
            <div className="chain-name-display">{rewardChain}</div>
          </div>

          {/* Request Chain Section */}
          <div className="chain-section">
            <div className="section-header">
              <span className="section-label">Request Chain</span>
              <span className="help-icon">ⓘ</span>
            </div>
            <div className="amount-display">
              <span className="amount-value">{rewardAmount} {tokenSymbol}</span>
              <div className="chain-badge">
                <span className="chain-icon">{renderChainIcon(sourceChain)}</span>
              </div>
            </div>
            <div className="chain-name-display">{sourceChain}</div>
          </div>

          {/* Cross Chain Path */}
          <div className="cross-chain-section">
            <div className="path-row">
              <span className="path-label">Cross Chain Path</span>

              <span className="path-value">{crossChainPath}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Send to</span>
              <span className="detail-value">{sendToAddress}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Network fee</span>
              <span className="detail-value">{networkFee}</span>
            </div>
          </div>

          {/* Warning */}
          <div className="warning-section">
            <div className="warning-icon">⚠️</div>
            <div className="warning-text">
              <strong>Warning</strong>
              <p>Cross Trade requests are created by external users, and liquidity is provided on Ethereum (L1). Please note that Cross Trade does not guarantee the validity of these requests or compensate for any potential loss. Be sure to verify the request carefully before providing liquidity.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <label className="understand-checkbox">
              <input 
                type="checkbox" 
                checked={riskUnderstood} 
                onChange={(e) => setRiskUnderstood(e.target.checked)}
              />
              <span className="checkmark"></span>
              I understand the risk
            </label>
            
            {/* Approval Button (for ERC20 tokens only) */}
            {!isETH && needsApproval && (
              <button 
                type="button"
                className="approve-btn"
                disabled={!riskUnderstood || isApprovalPending || isApprovalConfirming}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleApproval()
                }}
              >
                {isApprovalPending ? 'Confirming...' : isApprovalConfirming ? 'Processing...' : 'Approve Token Spending'}
              </button>
            )}
            
            {/* Provide Button */}
            <button 
              type="button"
              className={`provide-btn ${riskUnderstood && (!needsApproval || isETH) ? 'active' : ''}`}
              disabled={!riskUnderstood || isPending || isConfirming || (!isETH && needsApproval)}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleProvideCT()
              }}
            >
              {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Provide'}
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="success-modal-overlay" onClick={() => { setShowSuccessModal(false); onClose(); window.location.reload() }}>
          <div className="success-modal" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setShowSuccessModal(false); onClose(); window.location.reload() }} className="success-close-btn" aria-label="Close">
              <svg viewBox="0 0 12 12" fill="none">
                <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="success-glow-container">
              <div className="success-glow"></div>
              <div className="success-check-circle">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path className="check-path" d="M4 12L9 17L20 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <h3 className="success-heading">Liquidity Provided</h3>

            <div className="reward-display">
              <span className="reward-amount">{rewardAmount} {tokenSymbol}</span>
              {profitPercentage > 0 && (
                <span className="reward-profit">+{profitPercentage.toFixed(2)}% profit</span>
              )}
              <span className="reward-chain">on {rewardChain}</span>
            </div>

            {hash && (
              <a href={getExplorerUrl(l1ChainId, hash)} target="_blank" rel="noopener noreferrer" className="tx-hash-link">
                <span>{hash.slice(0, 14)}...{hash.slice(-12)}</span>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M10 2L2 10M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            )}

            <button onClick={() => { setShowSuccessModal(false); onClose(); window.location.reload() }} className="done-btn">
              Done
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
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

        .review-provide-modal {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 16px;
          padding: 20px;
          width: 90%;
          max-width: 420px;
          max-height: 85vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
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

        .provide-details {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .chain-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .section-label {
          color: #9ca3af;
          font-size: 14px;
          font-weight: 500;
        }

        .help-icon {
          color: #9ca3af;
          font-size: 14px;
          cursor: pointer;
        }

        .amount-display {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 6px 0 3px 0;
        }

        .amount-value {
          color: #ffffff;
          font-size: 22px;
          font-weight: 600;
        }

        .chain-badge {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .chain-icon {
          font-size: 16px;
        }

        .reward-symbol {
          font-size: 14px;
        }

        .chain-name-display {
          color: #9ca3af;
          font-size: 14px;
          font-weight: 500;
          margin: 2px 0;
        }

        .amount-usd {
          color: #9ca3af;
          font-size: 14px;
        }

        .cross-chain-section {
          background: rgba(26, 26, 26, 0.5);
          border: 1px solid #333333;
          border-radius: 12px;
          padding: 12px;
        }

        .path-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .path-label {
          color: #9ca3af;
          font-size: 14px;
        }

        .path-indicator {
          display: flex;
          align-items: center;
        }

        .path-badge {
          background: #22c55e;
          color: #ffffff;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
        }

        .path-value {
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .detail-row:last-child {
          margin-bottom: 0;
        }

        .detail-label {
          color: #9ca3af;
          font-size: 14px;
        }

        .detail-value {
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
        }

        .fee-usd {
          color: #9ca3af;
        }

        .warning-section {
          display: flex;
          gap: 10px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 8px;
          padding: 12px;
        }

        .warning-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .warning-text {
          flex: 1;
        }

        .warning-text strong {
          color: #f59e0b;
          font-size: 13px;
          font-weight: 600;
          display: block;
          margin-bottom: 3px;
        }

        .warning-text p {
          color: #d1d5db;
          font-size: 12px;
          line-height: 1.3;
          margin: 0;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 6px;
        }

        .understand-checkbox {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          user-select: none;
        }

        .understand-checkbox input[type="checkbox"] {
          position: absolute;
          opacity: 0;
          cursor: pointer;
        }

        .checkmark {
          position: relative;
          height: 20px;
          width: 20px;
          background-color: #1a1a1a;
          border: 2px solid #333333;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .understand-checkbox:hover .checkmark {
          border-color: #6366f1;
        }

        .understand-checkbox input:checked ~ .checkmark {
          background-color: #6366f1;
          border-color: #6366f1;
        }

        .understand-checkbox input:checked ~ .checkmark:after {
          content: "";
          position: absolute;
          display: block;
          left: 6px;
          top: 2px;
          width: 6px;
          height: 10px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .provide-btn {
          background: #6b7280;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 12px 20px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .provide-btn:disabled {
          background: #374151;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .provide-btn:hover:not(:disabled) {
          background: #4b5563;
        }

        /* Active state for provide button after understanding risk */
        .provide-btn.active:not(:disabled) {
          background: #6366f1;
          cursor: pointer;
        }

        .provide-btn.active:hover:not(:disabled) {
          background: #5855eb;
        }

        .approve-btn {
          background: #f59e0b;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 12px 20px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .approve-btn:disabled {
          background: #fbbf24;
          color: #92400e;
          cursor: not-allowed;
        }

        .approve-btn:hover:not(:disabled) {
          background: #d97706;
        }

        /* Success Modal */
        .success-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1001;
        }

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
        .success-close-btn:hover { opacity: 1; }
        .success-close-btn svg { width: 18px; height: 18px; }

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

        @keyframes draw-check { to { stroke-dashoffset: 0; } }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }

        .success-heading {
          color: #ffffff;
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 20px 0;
        }

        .reward-display {
          text-align: center;
          margin-bottom: 24px;
        }
        .reward-amount {
          display: block;
          font-size: 28px;
          font-weight: 600;
          color: #ffffff;
        }
        .reward-profit {
          display: block;
          color: #4ade80;
          font-size: 14px;
          font-weight: 500;
          margin: 8px 0;
        }
        .reward-chain {
          display: block;
          color: #6b7280;
          font-size: 13px;
        }

        .tx-hash-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          color: #e5e7eb;
          font-size: 13px;
          font-family: monospace;
          text-decoration: none;
          margin-bottom: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          box-sizing: border-box;
        }
        .tx-hash-link:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }

        .done-btn {
          display: block;
          width: 100%;
          padding: 12px;
          background: #6366f1;
          color: white;
          font-size: 14px;
          font-weight: 500;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          box-sizing: border-box;
          margin: 0 auto;
        }
        .done-btn:hover {
          background: #5558e3;
        }
      `}</style>
    </div>
  )
}
