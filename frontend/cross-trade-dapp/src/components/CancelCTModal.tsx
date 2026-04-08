'use client'

import { useState, useMemo } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId, useSwitchChain } from 'wagmi'
import {
  CANCEL_CT_ABI,
  getTokenDecimals,
  CHAIN_CONFIG_L2_L2,
  CHAIN_CONFIG_L2_L1,
  // L2_L2 specific imports
  getContractAddressFor_L2_L2,
  // L2_L1 specific imports
  getContractAddressFor_L2_L1,
  L2_L1_CANCEL_CT_ABI
} from '@/config/contracts'

interface CancelCTModalProps {
  isOpen: boolean
  onClose: () => void
  requestData: {
    saleCount: number
    l1token: string
    l2SourceToken: string
    l2DestinationToken: string
    requester: string
    receiver: string
    totalAmount: bigint
    ctAmount: bigint
    editedCtAmount?: bigint
    l1ChainId: bigint
    l2SourceChainId: number  // The actual source chain where request was created
    l2DestinationChainId: bigint
    hashValue: string
  }
}

export const CancelCTModal = ({ isOpen, onClose, requestData }: CancelCTModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [networkSwitching, setNetworkSwitching] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  
  const { address: userAddress } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { writeContract: writeCancelCT, data: cancelHash, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({
    hash: cancelHash,
  })

  // Detect communication mode based on destination chain
  const communicationMode = useMemo((): 'L2_L2' | 'L2_L1' => {
    const destinationChainId = Number(requestData.l2DestinationChainId)
    const l1ChainId = 11155111 // Ethereum Sepolia
    
    // If destination is Ethereum (L1) → L2_L1, otherwise → L2_L2
    return destinationChainId === l1ChainId ? 'L2_L1' : 'L2_L2'
  }, [requestData.l2DestinationChainId])

  // Get the correct ABI based on communication mode
  const getCancelABI = () => {
    return communicationMode === 'L2_L1' ? L2_L1_CANCEL_CT_ABI : CANCEL_CT_ABI
  }

  // Get the correct L1 contract address based on mode
  const getL1ContractAddress = () => {
    const l1ChainId = 11155111 // Ethereum Sepolia
    
    if (communicationMode === 'L2_L1') {
      return getContractAddressFor_L2_L1(l1ChainId, 'l1_cross_trade')
    } else {
      return getContractAddressFor_L2_L2(l1ChainId, 'l1_cross_trade')
    }
  }

  // Helper function to format token amounts with proper decimals using dynamic config
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
      return integerPart.toString()
    } else {
      const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
      const trimmedFractional = fractionalStr.replace(/0+$/, '')
      return `${integerPart.toString()}.${trimmedFractional}`
    }
  }

  // Helper function to get token symbol from address using dynamic config
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

  const handleCancelCT = async () => {
    if (!confirmCancel) {
      alert('Please confirm that you want to cancel this request')
      return
    }

    if (!userAddress) {
      alert('Please connect your wallet first')
      return
    }

    // Verify that the connected user is the requester
    if (userAddress.toLowerCase() !== requestData.requester.toLowerCase()) {
      alert('You can only cancel your own requests')
      return
    }

    setIsSubmitting(true)

    try {
      // Get L1 contract address using mode-aware configuration
      const requiredChainId = 11155111 // Ethereum Sepolia
      const l1ContractAddress = getL1ContractAddress()

      if (!l1ContractAddress || l1ContractAddress === '0x0000000000000000000000000000000000000000') {
        alert('L1 contract address not configured. Please contact support.')
        setIsSubmitting(false)
        return
      }

      console.log('🔴 CancelCTModal - Cancel request:', {
        mode: communicationMode,
        l1ContractAddress,
        abi: communicationMode === 'L2_L1' ? 'L2_L1_CANCEL_CT_ABI' : 'CANCEL_CT_ABI',
        destinationChainId: requestData.l2DestinationChainId.toString(),
        sourceChainId: requestData.l2SourceChainId,
        saleCount: requestData.saleCount
      })

      // Check if we need to switch to L1 (Ethereum Sepolia)
      if (chainId !== requiredChainId) {
        setNetworkSwitching(true)
        try {
          await switchChain({ chainId: requiredChainId })
          // Wait a bit for the network switch to fully complete
          await new Promise(resolve => setTimeout(resolve, 1500))
        } catch (switchError) {
          alert('Please switch to Ethereum Sepolia network to cancel requests')
          setIsSubmitting(false)
          setNetworkSwitching(false)
          return
        }
        setNetworkSwitching(false)
      }

      // Final verification before contract call
      if (chainId !== requiredChainId) {
        throw new Error(`Chain mismatch: current ${chainId}, required ${requiredChainId}. Please ensure you're on Ethereum Sepolia.`)
      }

      if (userAddress.toLowerCase() !== requestData.requester.toLowerCase()) {
        throw new Error(`Permission denied: Only the requester can cancel requests. Requester: ${requestData.requester}, Connected: ${userAddress}`)
      }

      // Use mode-aware ABI and arguments
      const cancelABI = getCancelABI()
      
      // Build arguments based on communication mode
      let contractArgs: any
      
      if (communicationMode === 'L2_L2') {
        // NEW contract (L2toL2CrossTradeL1.sol) - 11 params
        contractArgs = [
          requestData.l1token as `0x${string}`,
          requestData.l2SourceToken as `0x${string}`,
          requestData.l2DestinationToken as `0x${string}`,
          requestData.receiver as `0x${string}`,
          requestData.totalAmount,
          requestData.ctAmount,
          BigInt(requestData.saleCount),
          BigInt(requestData.l2SourceChainId), // _l2SourceChainId
          requestData.l2DestinationChainId, // _l2DestinationChainId
          200000, // _minGasLimit
          requestData.hashValue as `0x${string}`
        ] as const
      } else {
        // OLD contract (L1CrossTrade.sol) - 9 params
        contractArgs = [
          requestData.l1token as `0x${string}`,
          requestData.l2SourceToken as `0x${string}`, // Used as _l2token in OLD contract
          requestData.receiver as `0x${string}`,
          requestData.totalAmount,
          requestData.ctAmount,
          BigInt(requestData.saleCount),
          BigInt(requestData.l2SourceChainId), // _l2chainId (source chain in OLD contract)
          200000, // _minGasLimit
          requestData.hashValue as `0x${string}`
        ] as const
      }
      
      console.log('🔴 CancelCTModal - Cancel CT:', {
        mode: communicationMode,
        abi: communicationMode === 'L2_L1' ? 'L2_L1_CANCEL_CT_ABI (9 params)' : 'CANCEL_CT_ABI (11 params)',
        l1ContractAddress,
        saleCount: requestData.saleCount,
        argsCount: contractArgs.length
      })

      await writeCancelCT({
        address: l1ContractAddress as `0x${string}`,
        abi: cancelABI,
        functionName: 'cancel',
        args: contractArgs,
        chainId: requiredChainId
      })
    } catch (error) {
      alert(`Cancel request failed: ${(error as any)?.message || 'Unknown error'}`)
      setIsSubmitting(false)
    }
  }

  // Handle successful transaction - show success modal
  if (isSuccess && !showSuccessModal) {
    setShowSuccessModal(true)
    setIsSubmitting(false)
  }

  if (!isOpen) return null

  const totalAmount = formatTokenAmount(requestData.totalAmount, requestData.l2SourceToken)
  const ctAmount = formatTokenAmount(requestData.ctAmount, requestData.l2SourceToken)
  const tokenSymbol = getTokenSymbol(requestData.l2SourceToken)
  const serviceFee = requestData.totalAmount - requestData.ctAmount
  const serviceFeeFormatted = formatTokenAmount(serviceFee, requestData.l2SourceToken)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cancel-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 12 12" fill="none">
            <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Header */}
        <div className="modal-header">
          <h3>Cancel Request</h3>
        </div>

        {/* Warning */}
        <div className="warning-banner">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 9V13M12 17H12.01M12 3L2 21H22L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="warning-content">
            <span className="warning-title">This action cannot be undone</span>
            <span className="warning-desc">Your request will be permanently cancelled</span>
          </div>
        </div>

        {/* Request Info */}
        <div className="summary-section">
          <div className="summary-row">
            <span className="label">Request</span>
            <span className="value">#{requestData.saleCount}</span>
          </div>
          <div className="summary-row">
            <span className="label">Total Amount</span>
            <span className="value mono">{totalAmount} {tokenSymbol}</span>
          </div>
          <div className="summary-row">
            <span className="label">Provider Receives</span>
            <span className="value mono">{ctAmount} {tokenSymbol}</span>
          </div>
          <div className="summary-row">
            <span className="label">Service Fee</span>
            <span className="value mono fee">{serviceFeeFormatted} {tokenSymbol}</span>
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <label className="confirm-checkbox">
          <input
            type="checkbox"
            checked={confirmCancel}
            onChange={(e) => setConfirmCancel(e.target.checked)}
            disabled={isSubmitting || isConfirming}
          />
          <span className="checkbox-box">
            <svg viewBox="0 0 12 12" fill="none">
              <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="checkbox-text">I understand this cannot be undone</span>
        </label>

        {/* Status Messages */}
        {(networkSwitching || isConfirming) && (
          <div className="status-bar processing">
            <div className="spinner"></div>
            <span>{networkSwitching ? 'Switching to Ethereum...' : 'Confirming...'}</span>
          </div>
        )}

        {(writeError || receiptError) && (
          <div className="status-bar error">
            <span>{((writeError as any)?.shortMessage || (receiptError as any)?.shortMessage) || 'Transaction failed'}</span>
          </div>
        )}

        {/* Actions */}
        <div className="btn-row">
          <button className="btn btn-cancel" onClick={onClose} disabled={isSubmitting || isConfirming}>
            Close
          </button>
          <button
            className="btn btn-danger"
            onClick={handleCancelCT}
            disabled={!confirmCancel || isSubmitting || isConfirming || isSuccess || networkSwitching}
          >
            {networkSwitching || isSubmitting || isConfirming ? 'Processing...' : 'Cancel Request'}
          </button>
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

            <div className="cancelled-icon-container">
              <div className="cancelled-glow"></div>
              <div className="cancelled-icon-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <h3 className="success-heading">Request Cancelled</h3>

            <p className="success-desc">Request #{requestData.saleCount} will be removed from history</p>

            {cancelHash && (
              <button
                className="tx-hash-link"
                onClick={() => {
                  navigator.clipboard.writeText(cancelHash)
                  alert('Transaction hash copied!')
                }}
              >
                <span>{cancelHash.slice(0, 14)}...{cancelHash.slice(-12)}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
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
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .cancel-modal {
          background: #131316;
          border: 1px solid #2a2a2e;
          border-radius: 16px;
          padding: 24px;
          width: 94%;
          max-width: 400px;
          position: relative;
        }

        /* Close Button */
        .close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          padding: 0;
          opacity: 0.7;
          transition: all 0.15s;
        }

        .close-btn:hover {
          opacity: 1;
          color: #fff;
        }

        .close-btn svg {
          width: 16px;
          height: 16px;
        }

        /* Header */
        .modal-header {
          margin-bottom: 20px;
        }

        .modal-header h3 {
          color: #ffffff;
          font-size: 17px;
          font-weight: 600;
          margin: 0;
        }

        /* Warning Banner */
        .warning-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .warning-banner svg {
          color: #ef4444;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .warning-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .warning-title {
          color: #ef4444;
          font-size: 14px;
          font-weight: 600;
        }

        .warning-desc {
          color: #fca5a5;
          font-size: 13px;
        }

        /* Summary Section */
        .summary-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid #1f1f23;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .summary-row .label {
          color: #71717a;
          font-size: 14px;
        }

        .summary-row .value {
          color: #e4e4e7;
          font-size: 15px;
          font-weight: 500;
        }

        .summary-row .value.mono {
          font-family: 'JetBrains Mono', monospace;
        }

        .summary-row .value.fee {
          color: #fbbf24;
        }

        /* Checkbox */
        .confirm-checkbox {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          cursor: pointer;
        }

        .confirm-checkbox input {
          display: none;
        }

        .checkbox-box {
          width: 20px;
          height: 20px;
          border: 2px solid #3f3f46;
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .checkbox-box svg {
          width: 12px;
          height: 12px;
          color: transparent;
        }

        .confirm-checkbox input:checked + .checkbox-box {
          background: #ef4444;
          border-color: #ef4444;
        }

        .confirm-checkbox input:checked + .checkbox-box svg {
          color: #ffffff;
        }

        .checkbox-text {
          color: #a1a1aa;
          font-size: 13px;
        }

        /* Status Bar */
        .status-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .status-bar.processing {
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          color: #818cf8;
        }

        .status-bar.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* Buttons */
        .btn-row {
          display: flex;
          gap: 12px;
        }

        .btn {
          flex: 1;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .btn-cancel {
          background: #1f1f23;
          border: 1px solid #27272a;
          color: #a1a1aa;
        }

        .btn-cancel:hover:not(:disabled) {
          background: #27272a;
          border-color: #3f3f46;
          color: #e4e4e7;
        }

        .btn-danger {
          background: #ef4444;
          border: none;
          color: #ffffff;
        }

        .btn-danger:hover:not(:disabled) {
          background: #dc2626;
        }

        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Success Modal */
        .success-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
        }

        .success-modal {
          background: #131316;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 32px 24px 28px;
          width: 100%;
          max-width: 360px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
        }

        .success-close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          padding: 0;
          opacity: 0.7;
          transition: all 0.15s;
        }

        .success-close-btn:hover {
          opacity: 1;
          color: #fff;
        }

        .success-close-btn svg {
          width: 16px;
          height: 16px;
        }

        .cancelled-icon-container {
          position: relative;
          width: 64px;
          height: 64px;
          margin-bottom: 20px;
        }

        .cancelled-glow {
          position: absolute;
          inset: -8px;
          background: radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%);
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        .cancelled-icon-circle {
          position: relative;
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        }

        .success-heading {
          color: #ffffff;
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 8px;
        }

        .success-desc {
          color: #71717a;
          font-size: 14px;
          margin: 0 0 20px;
        }

        .tx-hash-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          align-self: stretch;
          color: #9ca3af;
          font-size: 13px;
          font-family: 'JetBrains Mono', monospace;
          margin-bottom: 16px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tx-hash-link:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }

        .done-btn {
          align-self: stretch;
          padding: 12px;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 10px;
          color: #e4e4e7;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .done-btn:hover {
          background: #3f3f46;
          border-color: #52525b;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }

        @media (max-width: 480px) {
          .cancel-modal {
            width: 95%;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  )
}
