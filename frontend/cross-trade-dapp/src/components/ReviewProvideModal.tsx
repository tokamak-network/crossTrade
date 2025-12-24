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
        {/* Header */}
        <div className="modal-header">
          <div className="header-left">
            <h3>Review Provide</h3>
            <span className="mode-badge">{communicationMode === 'L2_L2' ? 'L2 ↔ L2' : 'L2 → L1'}</span>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Trade Flow */}
        <div className="trade-flow">
          <div className="flow-card">
            <span className="flow-label">You Send</span>
            <div className="flow-amount">
              <span className="amount">{provideAmount}</span>
              <span className="token">{tokenSymbol}</span>
            </div>
            <div className="flow-chain">
              {renderChainIcon(provideChain)}
              <span>{provideChain}</span>
            </div>
            {actualCtAmount !== requestData.ctAmount && (
              <span className="edited-tag">Edited</span>
            )}
          </div>

          <div className="flow-connector">
            <div className="arrow-dots">
              <div className="dot-line one"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
              <div className="dot-line two"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
              <div className="dot-line three"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
              <div className="dot-line four"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
              <div className="dot-line five"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
              <div className="dot-line six"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
              <div className="dot-line seven"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
              <div className="dot-line eight"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
              <div className="dot-line nine"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
            </div>
          </div>

          <div className="flow-card receive">
            <div className="flow-label-row">
              <span className="flow-label">You Receive</span>
              <span className="profit-badge">+{profitPercentage.toFixed(2)}%</span>
            </div>
            <div className="flow-amount">
              <span className="amount">{rewardAmount}</span>
              <span className="token">{tokenSymbol}</span>
            </div>
            <div className="flow-chain">
              {renderChainIcon(rewardChain)}
              <span>{rewardChain}</span>
            </div>
          </div>
        </div>

        {/* Details Row */}
        <div className="details-row">
          <div className="detail recipient">
            <span className="detail-label">Recipient</span>
            <span className="detail-value mono">{requestData.receiver}</span>
          </div>
          <div className="detail fee">
            <span className="detail-label">Network Fee</span>
            <span className="detail-value mono">{networkFee}</span>
          </div>
        </div>

        {/* Warning */}
        <div className="warning-box">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 5V8.5M8 11H8.01M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>Cross Trade requests are created by external users, and liquidity is provided on Ethereum (L1). Cross Trade does not guarantee the validity of these requests or compensate for any potential loss. Verify carefully before providing.</span>
        </div>

        {/* Actions */}
        <div className="actions">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={riskUnderstood}
              onChange={(e) => setRiskUnderstood(e.target.checked)}
            />
            <span className="custom-checkbox"></span>
            <span>I understand the risks</span>
          </label>

          <div className="btn-row">
            {!isETH && needsApproval && (
              <button
                type="button"
                className="btn btn-approve"
                disabled={!riskUnderstood || isApprovalPending || isApprovalConfirming}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleApproval()
                }}
              >
                {isApprovalPending ? 'Confirming...' : isApprovalConfirming ? 'Processing...' : 'Approve'}
              </button>
            )}
            <button
              type="button"
              className={`btn btn-provide ${riskUnderstood && (!needsApproval || isETH) ? 'active' : ''}`}
              disabled={!riskUnderstood || isPending || isConfirming || (!isETH && needsApproval)}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleProvideCT()
              }}
            >
              {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Provide Liquidity'}
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
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .review-provide-modal {
          background: #131316;
          border: 1px solid #2a2a2e;
          border-radius: 16px;
          padding: 20px;
          width: 94%;
          max-width: 620px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
        }

        /* Header */
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .modal-header h3 {
          color: #ffffff;
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }

        .mode-badge {
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: #52525b;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .close-btn:hover {
          background: #27272a;
          color: #a1a1aa;
        }

        /* Trade Flow */
        .trade-flow {
          display: flex;
          align-items: stretch;
          gap: 0;
          margin-bottom: 12px;
        }

        .flow-card {
          flex: 1;
          background: #1a1a1d;
          border: 1px solid #27272a;
          border-radius: 12px 0 0 12px;
          border-right: none;
          padding: 14px;
          position: relative;
        }

        .flow-card.receive {
          background: linear-gradient(135deg, #1a1a1d 0%, #14261a 100%);
          border-color: rgba(34, 197, 94, 0.2);
          border-radius: 0 12px 12px 0;
          border-right: 1px solid rgba(34, 197, 94, 0.2);
          border-left: none;
        }

        .flow-label {
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #71717a;
          margin-bottom: 8px;
          display: block;
        }

        .flow-card.receive .flow-label {
          color: #22c55e;
        }

        .flow-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .flow-amount {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-bottom: 10px;
        }

        .flow-amount .amount {
          font-family: 'JetBrains Mono', monospace;
          font-size: 20px;
          font-weight: 600;
          color: #ffffff;
          font-feature-settings: 'tnum' on, 'lnum' on;
        }

        .flow-amount .token {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          font-weight: 500;
          color: #a1a1aa;
        }

        .flow-chain {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #71717a;
        }

        .flow-chain :global(img) {
          width: 16px !important;
          height: 16px !important;
          border-radius: 50%;
        }

        .flow-connector {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #131316;
          border-top: 1px solid #27272a;
          border-bottom: 1px solid #27272a;
          width: 50px;
          flex-shrink: 0;
        }

        .arrow-dots {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          animation: arrow-move 2s infinite ease;
        }

        @keyframes arrow-move {
          0% { transform: translateX(0); }
          50% { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }

        .dot {
          width: 4px;
          height: 4px;
          background: #6366f1;
          border-radius: 50%;
        }

        .dot-line {
          display: flex;
          gap: 2px;
        }

        .dot-line.one {
          margin-left: -16px;
        }

        .dot-line.two {
          margin-left: -8px;
        }

        .dot-line.three {
          margin-left: 0;
        }

        .dot-line.four {
          margin-left: 8px;
        }

        .dot-line.five {
          margin-left: 16px;
        }

        .dot-line.six {
          margin-left: 8px;
        }

        .dot-line.seven {
          margin-left: 0;
        }

        .dot-line.eight {
          margin-left: -8px;
        }

        .dot-line.nine {
          margin-left: -16px;
        }

        .profit-badge {
          background: #22c55e;
          color: #ffffff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
        }

        .edited-tag {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
          font-size: 9px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        /* Details Row */
        .details-row {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .detail {
          flex: 1;
          background: #1a1a1d;
          border: 1px solid #27272a;
          border-radius: 8px;
          padding: 10px 12px;
        }

        .detail-label {
          display: block;
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #52525b;
          margin-bottom: 4px;
        }

        .detail-value {
          display: block;
          font-size: 12px;
          color: #e4e4e7;
          font-weight: 500;
        }

        .detail-value.mono {
          font-family: 'JetBrains Mono', monospace;
          font-feature-settings: 'tnum' on, 'lnum' on;
        }

        .detail.recipient {
          flex: 3;
        }

        .detail.recipient .detail-value {
          font-size: 14px;
        }

        .detail.fee {
          flex: 1;
        }

        .detail.fee .detail-value {
          font-size: 14px;
        }

        /* Warning */
        .warning-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(251, 191, 36, 0.08);
          border: 1px solid rgba(251, 191, 36, 0.15);
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 14px;
        }

        .warning-box svg {
          color: #fbbf24;
          flex-shrink: 0;
        }

        .warning-box span {
          font-size: 11px;
          color: #a1a1aa;
          line-height: 1.4;
        }

        /* Actions */
        .actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          user-select: none;
        }

        .checkbox-row input {
          display: none;
        }

        .custom-checkbox {
          width: 18px;
          height: 18px;
          border: 2px solid #3f3f46;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .checkbox-row:hover .custom-checkbox {
          border-color: #6366f1;
        }

        .checkbox-row input:checked + .custom-checkbox {
          background: #6366f1;
          border-color: #6366f1;
        }

        .checkbox-row input:checked + .custom-checkbox::after {
          content: '';
          width: 5px;
          height: 9px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg) translateY(-1px);
        }

        .checkbox-row > span:last-child {
          font-size: 13px;
          color: #a1a1aa;
          font-weight: 500;
        }

        .btn-row {
          display: flex;
          gap: 8px;
        }

        .btn {
          flex: 1;
          padding: 14px 16px;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-approve {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #ffffff;
        }

        .btn-approve:hover:not(:disabled) {
          filter: brightness(1.1);
        }

        .btn-approve:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-provide {
          background: #27272a;
          color: #52525b;
          cursor: not-allowed;
        }

        .btn-provide.active {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #ffffff;
          cursor: pointer;
        }

        .btn-provide.active:hover {
          filter: brightness(1.1);
        }

        .btn-provide:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
          font-family: 'JetBrains Mono', monospace;
          font-size: 26px;
          font-weight: 600;
          font-feature-settings: 'tnum' on, 'lnum' on;
          color: #ffffff;
        }
        .reward-profit {
          display: inline-block;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: #ffffff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
          margin: 10px 0;
        }
        .reward-chain {
          display: block;
          color: #52525b;
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
          padding: 14px;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
          font-size: 14px;
          font-weight: 600;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          box-sizing: border-box;
          margin: 0 auto;
          transition: all 0.15s ease;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        .done-btn:hover {
          background: linear-gradient(135deg, #7c7ff5 0%, #6366f1 100%);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
        }
      `}</style>
    </div>
  )
}
