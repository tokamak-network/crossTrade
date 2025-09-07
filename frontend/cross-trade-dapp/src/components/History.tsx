'use client'

import { useEffect, useState } from 'react'
import { useAccount, usePublicClient, useContractRead } from 'wagmi'
import { CONTRACTS, CHAIN_CONFIG, getTokenDecimals } from '@/config/contracts'
import { Navigation } from './Navigation'
import { EditFeeModal } from './EditFeeModal'

interface RequestData {
  l1token: string
  l2SourceToken: string
  l2DestinationToken: string
  requester: string
  provider: string
  totalAmount: bigint
  ctAmount: bigint
  l1ChainId: bigint
  l2DestinationChainId: bigint
  hashValue: string
}

interface HistoryRequest {
  saleCount: number
  data: RequestData | null
  status: 'Completed' | 'Waiting' | 'Cancelled'
  type: 'Provide' | 'Request'
  date: string
}

export const History = () => {
  const { address: userAddress } = useAccount()
  const publicClient = usePublicClient()
  const [historyRequests, setHistoryRequests] = useState<HistoryRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'All' | 'Provide' | 'Request'>('All')
  const [selectedRequest, setSelectedRequest] = useState<HistoryRequest | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Thanos Sepolia chain ID (where the requests are)
  const CHAIN_ID = 111551119090

  // Get the current saleCount for this chain
  const { data: currentSaleCount } = useContractRead({
    address: CONTRACTS.L2_CROSS_TRADE as `0x${string}`,
    abi: [
      {
        inputs: [{ type: 'uint256', name: 'chainId' }],
        name: 'saleCountChainId',
        outputs: [{ type: 'uint256', name: '' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'saleCountChainId',
    args: [BigInt(CHAIN_ID)],
  })

  // Helper function to format token amounts with proper decimals
  const formatTokenAmount = (amount: bigint, tokenAddress: string) => {
    let symbol = 'UNKNOWN'
    let decimals = 18

    // Check against known token addresses
    Object.entries(CHAIN_CONFIG).forEach(([chainId, config]) => {
      Object.entries(config.tokens).forEach(([tokenSymbol, address]) => {
        if (address.toLowerCase() === tokenAddress.toLowerCase()) {
          symbol = tokenSymbol
          decimals = getTokenDecimals(tokenSymbol)
        }
      })
    })

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
    const config = CHAIN_CONFIG[chainIdNum as keyof typeof CHAIN_CONFIG]
    return config?.displayName || `Chain ${chainId}`
  }

  // Helper function to get chain emoji
  const getChainEmoji = (chainName: string) => {
    switch (chainName) {
      case 'GeorgeChain': return '🟣'
      case 'MonicaChain': return '🟢'
      case 'Thanos Sepolia': return '🔵'
      case 'Ethereum Sepolia': return '⚪'
      case 'Optimism Sepolia': return '🔴'
      default: return '⚫'
    }
  }

  // Helper function to get token symbol from address
  const getTokenSymbol = (tokenAddress: string) => {
    let symbol = 'UNKNOWN'
    Object.entries(CHAIN_CONFIG).forEach(([chainId, config]) => {
      Object.entries(config.tokens).forEach(([tokenSymbol, address]) => {
        if (address.toLowerCase() === tokenAddress.toLowerCase()) {
          symbol = tokenSymbol
        }
      })
    })
    return symbol
  }

  // Helper function to get token emoji
  const getTokenEmoji = (tokenSymbol: string) => {
    switch (tokenSymbol) {
      case 'USDC': return '🔵'
      case 'USDT': return '🟢'
      case 'ETH': return '⚪'
      case 'TON': return '💎'
      default: return '🔘'
    }
  }

  // Helper function to generate random status (for demo purposes)
  const getRandomStatus = (): 'Completed' | 'Waiting' | 'Cancelled' => {
    const rand = Math.random()
    if (rand < 0.6) return 'Completed'
    if (rand < 0.85) return 'Waiting'
    return 'Cancelled'
  }

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return '#10b981'
      case 'Waiting': return '#f59e0b'
      case 'Cancelled': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const fetchUserHistory = async () => {
    if (!publicClient || !currentSaleCount || !userAddress) return

    setLoading(true)
    setError(null)

    try {
      const totalRequests = Number(currentSaleCount)
      const userHistory: HistoryRequest[] = []

      console.log(`Fetching history for user ${userAddress}`)

      for (let saleCount = 1; saleCount <= totalRequests; saleCount++) {
        try {
          const data = await publicClient.readContract({
            address: CONTRACTS.L2_CROSS_TRADE as `0x${string}`,
            abi: [
              {
                inputs: [
                  { type: 'uint256', name: 'chainId' },
                  { type: 'uint256', name: 'saleCount' }
                ],
                name: 'dealData',
                outputs: [
                  { type: 'address', name: 'l1token' },
                  { type: 'address', name: 'l2SourceToken' },
                  { type: 'address', name: 'l2DestinationToken' },
                  { type: 'address', name: 'requester' },
                  { type: 'address', name: 'provider' },
                  { type: 'uint256', name: 'totalAmount' },
                  { type: 'uint256', name: 'ctAmount' },
                  { type: 'uint256', name: 'l1ChainId' },
                  { type: 'uint256', name: 'l2DestinationChainId' },
                  { type: 'bytes32', name: 'hashValue' },
                ],
                stateMutability: 'view',
                type: 'function',
              },
            ],
            functionName: 'dealData',
            args: [BigInt(CHAIN_ID), BigInt(saleCount)],
          }) as readonly [string, string, string, string, string, bigint, bigint, bigint, bigint, string]

          // Convert the tuple to RequestData object
          const requestData: RequestData = {
            l1token: data[0],
            l2SourceToken: data[1],
            l2DestinationToken: data[2],
            requester: data[3],
            provider: data[4],
            totalAmount: data[5],
            ctAmount: data[6],
            l1ChainId: data[7],
            l2DestinationChainId: data[8],
            hashValue: data[9],
          }

          // Check if user is involved (as requester or provider)
          const isRequester = requestData.requester.toLowerCase() === userAddress.toLowerCase()
          const isProvider = requestData.provider.toLowerCase() === userAddress.toLowerCase() && 
                            requestData.provider !== '0x0000000000000000000000000000000000000000'

          if (isRequester || isProvider) {
            // Generate a date (for demo, using current date minus some days)
            const daysAgo = Math.floor(Math.random() * 30)
            const date = new Date()
            date.setDate(date.getDate() - daysAgo)
            const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`

            userHistory.push({
              saleCount,
              data: requestData,
              status: getRandomStatus(),
              type: isProvider ? 'Provide' : 'Request',
              date: dateStr,
            })
          }
        } catch (err) {
          console.error(`Error fetching request ${saleCount}:`, err)
        }
      }

      // Sort by date (newest first)
      userHistory.sort((a, b) => b.saleCount - a.saleCount)
      setHistoryRequests(userHistory)

      console.log(`Found ${userHistory.length} history items for user`)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch history')
      console.error('Error fetching history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userAddress && currentSaleCount && Number(currentSaleCount) > 0) {
      fetchUserHistory()
    }
  }, [userAddress, currentSaleCount])

  const filteredRequests = historyRequests.filter(req => {
    if (activeFilter === 'All') return true
    return req.type === activeFilter
  })

  const handleEdit = (request: HistoryRequest) => {
    if (request.type !== 'Request') {
      alert('You can only edit your own requests')
      return
    }
    setSelectedRequest(request)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedRequest(null)
  }

  return (
    <div className="history-container">
      {/* Navigation */}
      <Navigation />
      
      <div className="geometric-background">
        <svg className="geometric-lines" viewBox="0 0 1200 800" fill="none">
          <path d="M50 150 L250 80 L450 200 L650 120 L850 180" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1.5"/>
          <path d="M150 350 L350 280 L550 400 L750 320 L950 380" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="1.5"/>
          <path d="M0 550 L200 480 L400 600 L600 520 L800 580" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="1.5"/>
          <path d="M700 80 L900 150 L1100 30 L1200 100" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1.5"/>
          <path d="M800 280 L1000 350 L1200 230" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="1.5"/>
          <path d="M650 480 L850 550 L1050 430 L1200 500" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="1.5"/>
        </svg>
      </div>

      <div className="content">
        <h1 className="page-title">Transaction History</h1>
        <p className="page-subtitle">View your past cross-trade requests and provides</p>
        
        <div className="history-wrapper">
          {!userAddress ? (
            <div className="connect-wallet-message">
              <p>Please connect your wallet to view transaction history</p>
            </div>
          ) : loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading history...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>Error loading history: {error}</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="empty-state">
              <p>No transaction history found</p>
            </div>
          ) : (
            <>
              {/* Filter Controls */}
              <div className="filter-controls">
                <div className="filter-section">
                  <span className="filter-label">Type</span>
                  <div className="filter-buttons">
                    <button 
                      className={`filter-btn ${activeFilter === 'All' ? 'active' : ''}`}
                      onClick={() => setActiveFilter('All')}
                    >
                      All
                    </button>
                    <button 
                      className={`filter-btn ${activeFilter === 'Provide' ? 'active' : ''}`}
                      onClick={() => setActiveFilter('Provide')}
                    >
                      Provide
                    </button>
                    <button 
                      className={`filter-btn ${activeFilter === 'Request' ? 'active' : ''}`}
                      onClick={() => setActiveFilter('Request')}
                    >
                      Request
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="table-container">
                <div className="table-header">
                  <div className="header-cell type-col">Type</div>
                  <div className="header-cell token-col">Token</div>
                  <div className="header-cell from-col">Network From</div>
                  <div className="header-cell to-col">Network To</div>
                  <div className="header-cell status-col">Status</div>
                  <div className="header-cell date-col">Date</div>
                  <div className="header-cell action-col">Action</div>
                </div>

                <div className="table-body">
                  {filteredRequests.map((request, index) => {
                    const data = request.data!
                    const tokenSymbol = getTokenSymbol(data.l2SourceToken)
                    const tokenEmoji = getTokenEmoji(tokenSymbol)
                    const amount = formatTokenAmount(data.totalAmount, data.l2SourceToken)
                    const fromChain = request.type === 'Provide' 
                      ? getChainName(BigInt(11155111)) // Ethereum for provides
                      : getChainName(BigInt(11155420)) // Source chain for requests
                    const toChain = getChainName(data.l2DestinationChainId)

                    return (
                      <div key={`history-${request.saleCount}-${index}`} className="table-row">
                        {/* Type Column */}
                        <div className="table-cell type-col">
                          <span className={`type-badge ${request.type.toLowerCase()}`}>
                            {request.type}
                          </span>
                        </div>

                        {/* Token Column */}
                        <div className="table-cell token-col">
                          <div className="token-info">
                            <span className="token-icon">{tokenEmoji}</span>
                            <div className="token-details">
                              <span className="token-amount">{amount}</span>
                              <span className="token-symbol">{tokenSymbol}</span>
                            </div>
                          </div>
                        </div>

                        {/* Network From Column */}
                        <div className="table-cell from-col">
                          <div className="network-info">
                            <span className="network-icon">{getChainEmoji(fromChain)}</span>
                            <span className="network-name">{fromChain}</span>
                          </div>
                        </div>

                        {/* Network To Column */}
                        <div className="table-cell to-col">
                          <div className="network-info">
                            <span className="network-icon">{getChainEmoji(toChain)}</span>
                            <span className="network-name">{toChain}</span>
                          </div>
                        </div>

                        {/* Status Column */}
                        <div className="table-cell status-col">
                          <span 
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(request.status) }}
                          >
                            {request.status}
                          </span>
                        </div>

                        {/* Date Column */}
                        <div className="table-cell date-col">
                          <span className="date-text">{request.date}</span>
                        </div>

                        {/* Action Column - Only for Waiting status */}
                        <div className="table-cell action-col">
                          {request.status === 'Waiting' && (
                            <button 
                              className="edit-btn"
                              onClick={() => handleEdit(request)}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <footer className="footer">
        Copyright © 2025. All rights reserved.
      </footer>

      {/* Edit Fee Modal */}
      {selectedRequest && selectedRequest.data && (
        <EditFeeModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          requestData={{
            saleCount: selectedRequest.saleCount,
            l1token: selectedRequest.data.l1token,
            l2SourceToken: selectedRequest.data.l2SourceToken,
            l2DestinationToken: selectedRequest.data.l2DestinationToken,
            totalAmount: selectedRequest.data.totalAmount,
            ctAmount: selectedRequest.data.ctAmount,
            l1ChainId: selectedRequest.data.l1ChainId,
            l2DestinationChainId: selectedRequest.data.l2DestinationChainId,
            hashValue: selectedRequest.data.hashValue,
          }}
        />
      )}

      <style jsx>{`
        .history-container {
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
          justify-content: flex-start;
          min-height: calc(100vh - 80px);
          padding: 40px 20px 60px 20px;
          margin-top: 80px;
        }

        .page-title {
          color: #ffffff;
          font-size: 32px;
          font-weight: 600;
          margin-bottom: 12px;
          text-align: center;
        }

        .page-subtitle {
          color: #9ca3af;
          font-size: 16px;
          margin-bottom: 40px;
          text-align: center;
          max-width: 600px;
        }

        .history-wrapper {
          width: 100%;
          max-width: 1200px;
        }

        .connect-wallet-message,
        .loading-state,
        .error-state,
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #9ca3af;
          background: rgba(20, 20, 20, 0.6);
          border-radius: 12px;
          border: 1px solid #333333;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #333;
          border-top: 3px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px auto;
        }

        .filter-controls {
          display: flex;
          gap: 32px;
          margin-bottom: 24px;
          padding: 20px;
          background: rgba(20, 20, 20, 0.6);
          border-radius: 12px;
          border: 1px solid #333333;
        }

        .filter-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .filter-label {
          color: #9ca3af;
          font-size: 14px;
          font-weight: 500;
        }

        .filter-buttons {
          display: flex;
          gap: 8px;
        }

        .filter-btn {
          background: rgba(26, 26, 26, 0.8);
          border: 1px solid #333333;
          border-radius: 20px;
          padding: 6px 16px;
          color: #9ca3af;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-btn:hover {
          border-color: #6366f1;
          color: #ffffff;
        }

        .filter-btn.active {
          background: #6366f1;
          border-color: #6366f1;
          color: #ffffff;
        }

        .table-container {
          background: rgba(20, 20, 20, 0.8);
          border: 1px solid #333333;
          border-radius: 16px;
          overflow: hidden;
          backdrop-filter: blur(10px);
        }

        .table-header {
          display: grid;
          grid-template-columns: 100px 200px 180px 180px 120px 150px 80px;
          gap: 16px;
          padding: 16px 20px;
          background: rgba(26, 26, 26, 0.5);
          border-bottom: 1px solid #333333;
        }

        .header-cell {
          color: #9ca3af;
          font-size: 14px;
          font-weight: 500;
          text-align: left;
        }

        .table-body {
          max-height: 600px;
          overflow-y: auto;
        }

        .table-row {
          display: grid;
          grid-template-columns: 100px 200px 180px 180px 120px 150px 80px;
          gap: 16px;
          padding: 20px;
          border-bottom: 1px solid rgba(51, 51, 51, 0.3);
          transition: all 0.2s ease;
        }

        .table-row:hover {
          background: rgba(99, 102, 241, 0.05);
        }

        .table-row:last-child {
          border-bottom: none;
        }

        .table-cell {
          display: flex;
          align-items: center;
        }

        .type-badge {
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .type-badge.provide {
          background: #3b82f6;
          color: #ffffff;
        }

        .type-badge.request {
          background: #8b5cf6;
          color: #ffffff;
        }

        .token-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .token-icon {
          font-size: 20px;
        }

        .token-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .token-amount {
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
        }

        .token-symbol {
          color: #9ca3af;
          font-size: 12px;
        }

        .network-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .network-icon {
          font-size: 16px;
        }

        .network-name {
          color: #ffffff;
          font-size: 14px;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 6px;
          color: #ffffff;
          font-size: 12px;
          font-weight: 600;
        }

        .date-text {
          color: #9ca3af;
          font-size: 14px;
        }

        .action-col {
          display: flex;
          justify-content: center;
        }

        .edit-btn {
          background: #6366f1;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .edit-btn:hover {
          background: #5855eb;
          transform: translateY(-1px);
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

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .table-header,
          .table-row {
            grid-template-columns: 80px 150px 140px 140px 100px 120px 70px;
            gap: 12px;
          }
        }

        @media (max-width: 768px) {
          .page-title {
            font-size: 28px;
          }
          
          .table-header,
          .table-row {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          
          .header-cell {
            display: none;
          }
          
          .table-cell {
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(51, 51, 51, 0.2);
          }
          
          .table-cell:before {
            content: attr(data-label);
            color: #9ca3af;
            font-size: 12px;
            font-weight: 500;
          }
        }
      `}</style>
    </div>
  )
}
