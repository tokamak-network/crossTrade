'use client'

import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { EDIT_FEE_ABI, getTokenDecimals, CHAIN_CONFIG } from '@/config/contracts'

interface EditFeeModalProps {
  isOpen: boolean
  onClose: () => void
  requestData: {
    saleCount: number
    l1token: string
    l2SourceToken: string
    l2DestinationToken: string
    totalAmount: bigint
    ctAmount: bigint
    l1ChainId: bigint
    l2DestinationChainId: bigint
    hashValue: string
  }
}

export const EditFeeModal = ({ isOpen, onClose, requestData }: EditFeeModalProps) => {
  const [newFeeAmount, setNewFeeAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { writeContract: writeEditFee, data: editFeeHash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: editFeeHash,
  })

  // Helper function to format token amounts with proper decimals
  const formatTokenAmount = (amount: bigint, tokenAddress: string) => {
    let decimals = 18

    // Check against known token addresses
    Object.entries(CHAIN_CONFIG).forEach(([, config]) => {
      Object.entries(config.tokens).forEach(([tokenSymbol, address]) => {
        if (address.toLowerCase() === tokenAddress.toLowerCase()) {
          decimals = getTokenDecimals(tokenSymbol)
        }
      })
    })

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

  // Helper function to get token symbol from address
  const getTokenSymbol = (tokenAddress: string) => {
    let symbol = 'UNKNOWN'
    Object.entries(CHAIN_CONFIG).forEach(([, config]) => {
      Object.entries(config.tokens).forEach(([tokenSymbol, address]) => {
        if (address.toLowerCase() === tokenAddress.toLowerCase()) {
          symbol = tokenSymbol
        }
      })
    })
    return symbol
  }

  // Helper function to convert amount to wei based on token decimals
  const toTokenWei = (amount: string, tokenSymbol: string) => {
    const decimals = getTokenDecimals(tokenSymbol)
    return BigInt(Math.floor(parseFloat(amount || '0') * Math.pow(10, decimals)))
  }

  const handleEditFee = async () => {
    if (!newFeeAmount || parseFloat(newFeeAmount) <= 0) {
      alert('Please enter a valid fee amount')
      return
    }

    const tokenSymbol = getTokenSymbol(requestData.l2SourceToken)
    const newCtAmountWei = toTokenWei(newFeeAmount, tokenSymbol)
    
    if (newCtAmountWei >= requestData.totalAmount) {
      alert('New fee amount must be less than total amount')
      return
    }

    setIsSubmitting(true)

    try {
      // Get L1 contract address
      const l1ContractAddress = CHAIN_CONFIG[11155111].contracts.L1_CROSS_TRADE

      if (!l1ContractAddress || l1ContractAddress === '0x0000000000000000000000000000000000000000') {
        alert('L1 contract address not configured. Please contact support.')
        setIsSubmitting(false)
        return
      }

      await writeEditFee({
        address: l1ContractAddress as `0x${string}`,
        abi: EDIT_FEE_ABI,
        functionName: 'editFee',
        args: [
          requestData.l1token as `0x${string}`,
          requestData.l2SourceToken as `0x${string}`,
          requestData.totalAmount,
          requestData.ctAmount,
          newCtAmountWei,
          BigInt(requestData.saleCount),
          requestData.l2DestinationChainId,
          requestData.hashValue as `0x${string}`
        ]
      })
    } catch (error) {
      console.error('❌ Edit fee failed:', error)
      setIsSubmitting(false)
    }
  }

  // Handle successful transaction
  if (isSuccess) {
    setTimeout(() => {
      onClose()
      window.location.reload() // Refresh to show updated data
    }, 2000)
  }

  if (!isOpen) return null

  const currentAmount = formatTokenAmount(requestData.ctAmount, requestData.l2SourceToken)
  const totalAmount = formatTokenAmount(requestData.totalAmount, requestData.l2SourceToken)
  const tokenSymbol = getTokenSymbol(requestData.l2SourceToken)
  const currentFee = requestData.totalAmount - requestData.ctAmount
  const currentFeeFormatted = formatTokenAmount(currentFee, requestData.l2SourceToken)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Service Fee</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="info-section">
            <div className="info-row">
              <span className="info-label">Sale Count:</span>
              <span className="info-value">#{requestData.saleCount}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Total Amount:</span>
              <span className="info-value">{totalAmount} {tokenSymbol}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Current Amount (After Fee):</span>
              <span className="info-value">{currentAmount} {tokenSymbol}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Current Service Fee:</span>
              <span className="info-value">{currentFeeFormatted} {tokenSymbol}</span>
            </div>
          </div>

          <div className="input-section">
            <label htmlFor="newFee">New Amount (After Fee)</label>
            <div className="input-wrapper">
              <input
                id="newFee"
                type="number"
                step="0.000001"
                placeholder={`Enter new amount (max: ${totalAmount})`}
                value={newFeeAmount}
                onChange={(e) => setNewFeeAmount(e.target.value)}
                disabled={isSubmitting || isConfirming}
              />
              <span className="input-suffix">{tokenSymbol}</span>
            </div>
            {newFeeAmount && (
              <div className="fee-preview">
                New Service Fee: {parseFloat(totalAmount) - parseFloat(newFeeAmount)} {tokenSymbol}
              </div>
            )}
          </div>

          {isConfirming && (
            <div className="status-message confirming">
              <div className="spinner"></div>
              <span>Confirming transaction...</span>
            </div>
          )}

          {isSuccess && (
            <div className="status-message success">
              ✅ Fee updated successfully!
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="cancel-btn" 
            onClick={onClose}
            disabled={isSubmitting || isConfirming}
          >
            Cancel
          </button>
          <button 
            className="confirm-btn"
            onClick={handleEditFee}
            disabled={!newFeeAmount || isSubmitting || isConfirming || isSuccess}
          >
            {isSubmitting || isConfirming ? 'Processing...' : 'Update Fee'}
          </button>
        </div>
      </div>

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
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: #1a1a1a;
          border: 1px solid #333333;
          border-radius: 16px;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid #333333;
        }

        .modal-header h2 {
          color: #ffffff;
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        .modal-body {
          padding: 24px;
        }

        .info-section {
          background: rgba(26, 26, 26, 0.5);
          border: 1px solid #333333;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .info-row:not(:last-child) {
          border-bottom: 1px solid rgba(51, 51, 51, 0.5);
        }

        .info-label {
          color: #9ca3af;
          font-size: 14px;
        }

        .info-value {
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
        }

        .input-section {
          margin-bottom: 24px;
        }

        .input-section label {
          display: block;
          color: #9ca3af;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-wrapper input {
          flex: 1;
          background: rgba(26, 26, 26, 0.5);
          border: 1px solid #333333;
          border-radius: 8px;
          color: #ffffff;
          font-size: 16px;
          padding: 12px;
          padding-right: 60px;
          transition: all 0.2s ease;
        }

        .input-wrapper input:focus {
          outline: none;
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.05);
        }

        .input-wrapper input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .input-suffix {
          position: absolute;
          right: 12px;
          color: #9ca3af;
          font-size: 14px;
          font-weight: 600;
        }

        .fee-preview {
          margin-top: 8px;
          color: #f59e0b;
          font-size: 13px;
          font-weight: 500;
        }

        .status-message {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .status-message.confirming {
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid #6366f1;
          color: #6366f1;
        }

        .status-message.success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid #10b981;
          color: #10b981;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .modal-footer {
          display: flex;
          gap: 12px;
          padding: 24px;
          border-top: 1px solid #333333;
        }

        .cancel-btn,
        .confirm-btn {
          flex: 1;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .cancel-btn {
          background: rgba(26, 26, 26, 0.8);
          border: 1px solid #333333;
          color: #ffffff;
        }

        .cancel-btn:hover:not(:disabled) {
          background: rgba(51, 51, 51, 0.8);
        }

        .confirm-btn {
          background: #6366f1;
          color: #ffffff;
        }

        .confirm-btn:hover:not(:disabled) {
          background: #5855eb;
        }

        .cancel-btn:disabled,
        .confirm-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .modal-content {
            width: 95%;
            max-height: 90vh;
          }
        }
      `}</style>
    </div>
  )
}