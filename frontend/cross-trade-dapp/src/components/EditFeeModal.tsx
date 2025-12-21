'use client'

import { useState, useMemo } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId, useSwitchChain } from 'wagmi'
import { 
  EDIT_FEE_ABI, 
  getTokenDecimals, 
  CHAIN_CONFIG_L2_L2,
  CHAIN_CONFIG_L2_L1,
  // L2_L2 specific imports
  getContractAddressFor_L2_L2,
  // L2_L1 specific imports
  getContractAddressFor_L2_L1,
  L2_L1_EDIT_FEE_ABI
} from '@/config/contracts'

interface EditFeeModalProps {
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
    l2SourceChainId: number  // Added: The actual source chain where request was created
    l2DestinationChainId: bigint
    hashValue: string
  }
}

export const EditFeeModal = ({ isOpen, onClose, requestData }: EditFeeModalProps) => {
  const [newFeeAmount, setNewFeeAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [networkSwitching, setNetworkSwitching] = useState(false)
  
  const { address: userAddress } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { writeContract: writeEditFee, data: editFeeHash, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({
    hash: editFeeHash,
  })

  // Detect communication mode based on destination chain
  const communicationMode = useMemo((): 'L2_L2' | 'L2_L1' => {
    const destinationChainId = Number(requestData.l2DestinationChainId)
    const l1ChainId = 11155111 // Ethereum Sepolia
    
    // If destination is Ethereum (L1) → L2_L1, otherwise → L2_L2
    return destinationChainId === l1ChainId ? 'L2_L1' : 'L2_L2'
  }, [requestData.l2DestinationChainId])

  // Get the correct ABI based on communication mode
  const getEditFeeABI = () => {
    return communicationMode === 'L2_L1' ? L2_L1_EDIT_FEE_ABI : EDIT_FEE_ABI
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

    if (!userAddress) {
      alert('Please connect your wallet first')
      return
    }

    // Verify that the connected user is the requester
    if (userAddress.toLowerCase() !== requestData.requester.toLowerCase()) {
      alert('You can only edit fees for your own requests')
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
      // Get L1 contract address using mode-aware configuration
      const requiredChainId = 11155111 // Ethereum Sepolia
      const l1ContractAddress = getL1ContractAddress()

      if (!l1ContractAddress || l1ContractAddress === '0x0000000000000000000000000000000000000000') {
        alert('L1 contract address not configured. Please contact support.')
        setIsSubmitting(false)
        return
      }

      console.log('🟡 EditFeeModal - Edit fee:', {
        mode: communicationMode,
        l1ContractAddress,
        abi: communicationMode === 'L2_L1' ? 'L2_L1_EDIT_FEE_ABI' : 'EDIT_FEE_ABI',
        destinationChainId: requestData.l2DestinationChainId.toString(),
        sourceChainId: requestData.l2SourceChainId,
        saleCount: requestData.saleCount
      })

      // Check if we need to switch to L1 (Ethereum Sepolia)
      // requiredChainId already defined above
      if (chainId !== requiredChainId) {
        setNetworkSwitching(true)
        try {
          await switchChain({ chainId: requiredChainId })
          // Wait a bit for the network switch to fully complete
          await new Promise(resolve => setTimeout(resolve, 1500))
        } catch (switchError) {
          alert('Please switch to Ethereum Sepolia network to edit fees')
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
        throw new Error(`Permission denied: Only the requester can edit fees. Requester: ${requestData.requester}, Connected: ${userAddress}`)
      }

      // Use mode-aware ABI and arguments
      const editFeeABI = getEditFeeABI()
      
      // Build arguments based on communication mode
      let contractArgs: any
      
      if (communicationMode === 'L2_L2') {
        // NEW contract (L2toL2CrossTradeL1.sol) - 11 params
        // Note: Always pass the ORIGINAL ctAmount from L2, not the edited one
        contractArgs = [
          requestData.l1token as `0x${string}`,
          requestData.l2SourceToken as `0x${string}`,
          requestData.l2DestinationToken as `0x${string}`,
          requestData.receiver as `0x${string}`,
          requestData.totalAmount,
          requestData.ctAmount, // Original ctAmount from L2
          newCtAmountWei, // New edited amount
          BigInt(requestData.saleCount),
          BigInt(requestData.l2SourceChainId), // _l2SourceChainId
          requestData.l2DestinationChainId, // _l2DestinationChainId
          requestData.hashValue as `0x${string}`
        ] as const
      } else {
        // OLD contract (L1CrossTrade.sol) - 9 params
        // Note: Always pass the ORIGINAL ctAmount from L2, not the edited one
        contractArgs = [
          requestData.l1token as `0x${string}`,
          requestData.l2SourceToken as `0x${string}`, // Used as _l2token in OLD contract
          requestData.receiver as `0x${string}`,
          requestData.totalAmount,
          requestData.ctAmount, // Original ctAmount from L2
          newCtAmountWei, // New edited amount
          BigInt(requestData.saleCount),
          BigInt(requestData.l2SourceChainId), // _l2chainId (source chain in OLD contract)
          requestData.hashValue as `0x${string}`
        ] as const
      }
      
      console.log('🟡 EditFeeModal - Edit Fee:', {
        mode: communicationMode,
        abi: communicationMode === 'L2_L1' ? 'L2_L1_EDIT_FEE_ABI (9 params)' : 'EDIT_FEE_ABI (11 params)',
        l1ContractAddress,
        saleCount: requestData.saleCount,
        argsCount: contractArgs.length
      })

      await writeEditFee({
        address: l1ContractAddress as `0x${string}`,
        abi: editFeeABI,
        functionName: 'editFee',
        args: contractArgs,
        chainId: requiredChainId
      })
    } catch (error) {
      alert(`Edit fee failed: ${(error as any)?.message || 'Unknown error'}`)
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

  // Use edited amount if available, otherwise use original ctAmount
  const actualCtAmount = requestData.editedCtAmount || requestData.ctAmount
  const currentAmount = formatTokenAmount(actualCtAmount, requestData.l2SourceToken)
  const totalAmount = formatTokenAmount(requestData.totalAmount, requestData.l2SourceToken)
  const tokenSymbol = getTokenSymbol(requestData.l2SourceToken)
  const currentFee = requestData.totalAmount - actualCtAmount
  const currentFeeFormatted = formatTokenAmount(currentFee, requestData.l2SourceToken)
  const hasBeenEdited = requestData.editedCtAmount !== undefined && requestData.editedCtAmount > BigInt(0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Service Fee</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Mode Indicator */}
          <div style={{ 
            padding: '10px 12px', 
            marginBottom: '16px', 
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
                ? 'Using L2_L2 edit contract' 
                : 'Using L2_L1 edit contract'}
            </span>
          </div>

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
              <span className="info-label">
                Current Amount (After Fee):
                {hasBeenEdited && (
                  <span style={{ 
                    fontSize: '11px', 
                    color: '#f59e0b', 
                    fontWeight: '600',
                    marginLeft: '8px'
                  }}>
                    📝 EDITED
                  </span>
                )}
              </span>
              <span className="info-value">{currentAmount} {tokenSymbol}</span>
            </div>
            {hasBeenEdited && (
              <div className="info-row">
                <span className="info-label">Original Amount:</span>
                <span className="info-value">{formatTokenAmount(requestData.ctAmount, requestData.l2SourceToken)} {tokenSymbol}</span>
              </div>
            )}
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
                min="0"
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

          {networkSwitching && (
            <div className="status-message switching">
              <div className="spinner"></div>
              <span>Switching to Ethereum Sepolia...</span>
            </div>
          )}

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

          {(writeError || receiptError) && (
            <div className="status-message error">
              ❌ Error: {(writeError as any)?.message || (receiptError as any)?.message || 'Transaction failed'}
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
            disabled={!newFeeAmount || isSubmitting || isConfirming || isSuccess || networkSwitching}
          >
            {networkSwitching ? 'Switching Network...' : isSubmitting || isConfirming ? 'Processing...' : 'Update Fee'}
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

        .status-message.switching {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid #f59e0b;
          color: #f59e0b;
        }

        .status-message.success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid #10b981;
          color: #10b981;
        }

        .status-message.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          color: #ef4444;
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