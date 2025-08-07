'use client'

import { useState } from 'react'

export const CreateRequest = () => {
  const [requestFrom, setRequestFrom] = useState('GeorgeChain')
  const [requestTo, setRequestTo] = useState('MonicaChain')
  const [sendAmount, setSendAmount] = useState('')
  const [sendToken, setSendToken] = useState('USDT')
  const [receiveAmount, setReceiveAmount] = useState('')
  const [receiveToken, setReceiveToken] = useState('USDT')
  const [toAddress, setToAddress] = useState('')
  const [serviceFeeMode, setServiceFeeMode] = useState('recommended') // 'recommended' or 'advanced'
  const [customFee, setCustomFee] = useState('')

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
    return result > 0 ? result.toFixed(2) : '0'
  }

  // Update receive amount when send amount or fee changes
  const currentReceiveAmount = calculateReceiveAmount()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log('Form submitted')
  }

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
        <h1 className="page-title">Create a request</h1>
        
        <div className="form-container">
          <form onSubmit={handleSubmit} className="request-form">
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
                    <option value="GeorgeChain">🟣 GeorgeChain</option>
                    <option value="MonicaChain">🟢 MonicaChain</option>
                    <option value="Arbitrum">🔵 Arbitrum</option>
                    <option value="Ethereum">⚪ Ethereum</option>
                    <option value="Optimism">🔴 Optimism</option>
                    <option value="Polygon">🟣 Polygon</option>
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
                    <option value="MonicaChain">🟢 MonicaChain</option>
                    <option value="GeorgeChain">🟣 GeorgeChain</option>
                    <option value="Ethereum">⚪ Ethereum</option>
                    <option value="Arbitrum">🔵 Arbitrum</option>
                    <option value="Optimism">🔴 Optimism</option>
                    <option value="Polygon">🟣 Polygon</option>
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
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                    <option value="ETH">ETH</option>
                    <option value="WETH">WETH</option>
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
                    className="amount-input readonly"
                  />
                  <div className="token-selector">
                    <div className="token-icon">🔵</div>
                    <select 
                      value={receiveToken} 
                      onChange={(e) => setReceiveToken(e.target.value)}
                      className="token-select"
                    >
                      <option value="USDC">USDC</option>
                      <option value="USDT">USDT</option>
                      <option value="ETH">ETH</option>
                      <option value="WETH">WETH</option>
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

            {/* Request Button */}
            <button type="submit" className="request-button">
              Request
            </button>
          </form>
        </div>

      </div>
      
      <footer className="footer">
        Copyright © 2025. All rights reserved.
      </footer>

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

        .page-title {
          color: #ffffff;
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 32px;
          text-align: center;
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

        @media (max-width: 640px) {
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
            margin-bottom: 32px;
          }
        }
      `}</style>
    </div>
  )
}