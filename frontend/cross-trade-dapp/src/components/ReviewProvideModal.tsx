'use client'

interface ReviewProvideModalProps {
  isOpen: boolean
  onClose: () => void
  requestData: {
    saleCount: number
    l1token: string
    l2SourceToken: string
    l2DestinationToken: string
    requester: string
    totalAmount: bigint
    ctAmount: bigint
    l1ChainId: bigint
    l2DestinationChainId: bigint
    hashValue: string
  }
}

export const ReviewProvideModal = ({ isOpen, onClose, requestData }: ReviewProvideModalProps) => {
  if (!isOpen) return null

  // Helper function to format token amounts with proper decimals
  const formatTokenAmount = (amount: bigint) => {
    // For demo purposes, using USDC (6 decimals)
    const decimals = 6
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
    switch (chainIdNum) {
      case 11155111: return 'Ethereum Sepolia'
      case 11155420: return 'Optimism Sepolia'
      case 111551119090: return 'Thanos Sepolia'
      case 123444: return 'GeorgeChain'
      case 1235555: return 'MonicaChain'
      default: return `Chain ${chainId}`
    }
  }

  // Helper function to get chain icon
  const getChainIcon = (chainName: string) => {
    switch (chainName) {
      case 'Ethereum Sepolia': return '⚪'
      case 'Optimism Sepolia': return '🔴'
      case 'Thanos Sepolia': return '🔵'
      case 'GeorgeChain': return '🟣'
      case 'MonicaChain': return '🟢'
      default: return '⚫'
    }
  }

  const provideAmount = formatTokenAmount(requestData.totalAmount)
  const rewardAmount = formatTokenAmount(requestData.ctAmount)
  const provideChain = getChainName(BigInt(11155111)) // Always Ethereum for L1
  const rewardChain = getChainName(requestData.l2DestinationChainId)
  const requestChain = getChainName(requestData.l2DestinationChainId)

  // Calculate cross chain path
  const crossChainPath = `${getChainName(BigInt(123444))} → ${rewardChain}` // GeorgeChain to destination
  const sendToAddress = requestData.requester.slice(0, 6) + '...' + requestData.requester.slice(-4)
  
  // Network fee calculation (example)
  const networkFee = '0.0012 ETH'
  const networkFeeUsd = '($0.67)'

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
          {/* Provide Chain Section */}
          <div className="chain-section">
            <div className="section-header">
              <span className="section-label">Provide Chain</span>
              <span className="help-icon">ⓘ</span>
            </div>
            <div className="amount-display">
              <span className="amount-value">{provideAmount} USDC</span>
              <div className="chain-badge">
                <span className="chain-icon">{getChainIcon(provideChain)}</span>
              </div>
            </div>
            <div className="chain-name-display">{provideChain}</div>
            <div className="amount-usd">($99.00)</div>
          </div>

          {/* Reward Chain Section */}
          <div className="chain-section">
            <div className="section-header">
              <span className="section-label">Reward Chain</span>
              <span className="help-icon">ⓘ</span>
            </div>
            <div className="amount-display">
              <span className="amount-value">{rewardAmount} USDC</span>
              <div className="chain-badge reward">
                <span className="chain-icon">{getChainIcon(rewardChain)}</span>
                <span className="reward-symbol">🔥</span>
              </div>
            </div>
            <div className="chain-name-display">{rewardChain}</div>
            <div className="amount-usd">($99.00)</div>
          </div>

          {/* Request Chain Section */}
          <div className="chain-section">
            <div className="section-header">
              <span className="section-label">Request Chain</span>
              <span className="help-icon">ⓘ</span>
            </div>
            <div className="amount-display">
              <span className="amount-value">{rewardAmount} USDC</span>
              <div className="chain-badge">
                <span className="chain-icon">{getChainIcon(requestChain)}</span>
              </div>
            </div>
            <div className="chain-name-display">{requestChain}</div>
            <div className="amount-usd">($99.00)</div>
          </div>

          {/* Cross Chain Path */}
          <div className="cross-chain-section">
            <div className="path-row">
              <span className="path-label">Cross Chain Path</span>
              <div className="path-indicator">
                <span className="path-badge">M</span>
              </div>
              <span className="path-value">{crossChainPath}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Send to</span>
              <span className="detail-value">{sendToAddress}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Network fee</span>
              <span className="detail-value">{networkFee} <span className="fee-usd">{networkFeeUsd}</span></span>
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
            <button className="understand-btn">I understand the risk</button>
            <button className="provide-btn">Provide</button>
          </div>
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
          gap: 4px;
          background: #2563eb;
          padding: 6px 10px;
          border-radius: 20px;
        }

        .chain-badge.reward {
          background: #2563eb;
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
          gap: 10px;
          margin-top: 6px;
        }

        .understand-btn {
          background: #1a1a1a;
          color: #ffffff;
          border: 1px solid #333333;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .understand-btn:hover {
          background: #262626;
          border-color: #6366f1;
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

        .provide-btn:hover {
          background: #4b5563;
        }

        /* Active state for provide button after understanding risk */
        .provide-btn.active {
          background: #6366f1;
        }

        .provide-btn.active:hover {
          background: #5855eb;
        }
      `}</style>
    </div>
  )
}
