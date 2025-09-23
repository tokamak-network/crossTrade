'use client'

import { useEffect, useState } from 'react'
import { usePublicClient, useContractRead, useAccount } from 'wagmi'
import { CONTRACTS, L2_CROSS_TRADE_ABI, CHAIN_CONFIG, CHAIN_IDS, getTokenAddress, getContractAddress, getTokenDecimals, getAllChains } from '@/config/contracts'
import { Navigation } from './Navigation'
import { ReviewProvideModal } from './ReviewProvideModal'

interface RequestData {
  l1token: string
  l2SourceToken: string
  l2DestinationToken: string
  requester: string
  receiver: string
  provider: string
  totalAmount: bigint
  ctAmount: bigint
  l1ChainId: bigint
  l2DestinationChainId: bigint
  hashValue: string
}

interface Request {
  saleCount: number
  chainId: number
  chainName: string
  data: RequestData | null
}

const FULFILLED_KEY = 'fulfilledSaleCounts_v1'

export const RequestPool = () => {
  const publicClient = usePublicClient()
  const { address: connectedAddress } = useAccount()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fulfilledSaleCounts, setFulfilledSaleCounts] = useState<Set<number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(FULFILLED_KEY)
      if (saved) return new Set(JSON.parse(saved))
    }
    return new Set()
  })
  const [forceRefresh, setForceRefresh] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [isProvideModalOpen, setIsProvideModalOpen] = useState(false)

  // Get all L2 chains that have L2_CROSS_TRADE contracts
  const getL2Chains = () => {
    const allChains = getAllChains()
    return allChains.filter(({ chainId, config }) => 
      config.contracts.L2_CROSS_TRADE && 
      config.contracts.L2_CROSS_TRADE !== '' &&
      chainId !== 11155111 // Exclude Ethereum Sepolia (L1)
    )
  }

  const l2Chains = getL2Chains()

  // Helper function to format token amounts with proper decimals
  const formatTokenAmount = (amount: bigint, tokenAddress: string) => {
    // Determine token symbol and decimals based on address
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
      return `${integerPart.toString()} ${symbol}`
    } else {
      const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
      const trimmedFractional = fractionalStr.replace(/0+$/, '')
      return `${integerPart.toString()}.${trimmedFractional} ${symbol}`
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
      case 'Optimism': return '🔴'
      case 'GeorgeChain': return '🟣'
      case 'MonicaChain': return '🟢'
      case 'Thanos': return '🔵'
      case 'Ethereum': return '⚪'
      default: return '⚫'
    }
  }

  // Helper function to get token emoji
  const getTokenEmoji = (tokenAddress: string) => {
    let symbol = 'UNKNOWN'
    Object.entries(CHAIN_CONFIG).forEach(([chainId, config]) => {
      Object.entries(config.tokens).forEach(([tokenSymbol, address]) => {
        if (address.toLowerCase() === tokenAddress.toLowerCase()) {
          symbol = tokenSymbol
        }
      })
    })

    switch (symbol) {
      case 'USDC': return '🔵'
      case 'USDT': return '🟢'
      case 'ETH': return '⚪'
      case 'TON': return '💎'
      default: return '🔘'
    }
  }

  const fetchAllRequests = async (fullRefresh = false) => {
    if (!publicClient) return

    setLoading(true)
    setError(null)

    try {
      const allRequestsArray: Request[] = []
      let newFulfilled = new Set<number>(fullRefresh ? [] : Array.from(fulfilledSaleCounts))

        // Get all possible destination chain IDs (all L2 chains + L1)
        const allDestinationChainIds = [
          ...l2Chains.map(chain => chain.chainId),
          11155111 // Ethereum Sepolia (L1)
        ]

        // Fetch requests from all L2 chains
        for (const { chainId: sourceChainId, config } of l2Chains) {
          const contractAddress = config.contracts.L2_CROSS_TRADE
          if (!contractAddress || contractAddress === '') continue


          try {
            // For each source chain, check requests going to all possible destinations
            for (const destinationChainId of allDestinationChainIds) {
              try {
                // Get the current saleCount for requests going to this destination
                const currentSaleCount = await publicClient.readContract({
                  address: contractAddress as `0x${string}`,
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
                  args: [BigInt(destinationChainId)],
                }) as bigint

                const totalRequests = Number(currentSaleCount)

                // Fetch individual requests for this source->destination pair
                for (let saleCount = 1; saleCount <= totalRequests; saleCount++) {
                  const requestKey = `${sourceChainId}_${destinationChainId}_${saleCount}`
                  if (!fullRefresh && fulfilledSaleCounts.has(Number(requestKey))) continue // skip known fulfilled
                  
                  try {
                    const data = await publicClient.readContract({
                      address: contractAddress as `0x${string}`,
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
                            { type: 'address', name: 'receiver' },
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
                      args: [BigInt(destinationChainId), BigInt(saleCount)],
                    }) as readonly [string, string, string, string, string, string, bigint, bigint, bigint, bigint, string]

                    // Convert the tuple to RequestData object
                    const requestData: RequestData = {
                      l1token: data[0],
                      l2SourceToken: data[1],
                      l2DestinationToken: data[2],
                      requester: data[3],
                      receiver: data[4],
                      provider: data[5],
                      totalAmount: data[6],
                      ctAmount: data[7],
                      l1ChainId: data[8],
                      l2DestinationChainId: data[9],
                      hashValue: data[10],
                    }

                    // If provider is not zero address, it's fulfilled
                    if (requestData.provider !== '0x0000000000000000000000000000000000000000') {
                      newFulfilled.add(Number(requestKey))
                      continue // skip fulfilled
                    }

                    // Only add if there's actual data (not empty request)
                    if (requestData.l1token !== '0x0000000000000000000000000000000000000000') {
                      allRequestsArray.push({ 
                        saleCount, 
                        chainId: sourceChainId, 
                        chainName: config.displayName,
                        data: requestData 
                      })
                    }
                  } catch (err) {
                    console.error(`Error fetching request ${saleCount} from ${config.displayName} to ${destinationChainId}:`, err)
                  }
                }
              } catch (err) {
                console.error(`Error fetching saleCount from ${config.displayName} to ${destinationChainId}:`, err)
              }
            }
        } catch (err) {
          console.error(`Error fetching from ${config.displayName}:`, err)
        }
      }

      // Sort by sale count descending (newest first)
      const sortedRequests = allRequestsArray.sort((a, b) => b.saleCount - a.saleCount)
      setRequests(sortedRequests)
      
      // Update fulfilled cache
      setFulfilledSaleCounts(newFulfilled)
      if (typeof window !== 'undefined') {
        localStorage.setItem(FULFILLED_KEY, JSON.stringify(Array.from(newFulfilled)))
      }

    } catch (err: any) {
      setError(err.message || 'Failed to fetch requests')
      console.error('Error fetching all requests:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (l2Chains.length > 0) {
      fetchAllRequests(forceRefresh)
      if (forceRefresh) setForceRefresh(false)
    }
  }, [forceRefresh]) // Only depend on forceRefresh, fetch on component mount

  const handleProvide = (request: Request) => {
    setSelectedRequest(request)
    setIsProvideModalOpen(true)
  }

  const handleCloseProvideModal = () => {
    setIsProvideModalOpen(false)
    setSelectedRequest(null)
  }

  const handleRefresh = () => {
    fetchAllRequests(false)
  }

  const handleForceRefresh = () => {
    setForceRefresh(true)
  }

  return (
    <div className="request-pool-container">
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
          <path d="M300 50 L500 120 L700 0" stroke="rgba(99, 102, 241, 0.18)" strokeWidth="1.5"/>
          <path d="M100 700 L300 630 L500 750 L700 680" stroke="rgba(99, 102, 241, 0.12)" strokeWidth="1.5"/>
        </svg>
      </div>

      <div className="content">
        <h1 className="page-title">Cross Trade Requests</h1>
        <p className="page-subtitle">Provide liquidity for a cross trade request and receive it back on L2 with a service fee.</p>
        
        {/* Debug info - show which chains are being queried */}
        <div className="debug-info">
          <p>Querying {l2Chains.length} L2 chains: {l2Chains.map(chain => chain.config.displayName).join(', ')}</p>
        </div>
        
        <div className="pool-container">
          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading requests...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p>Error loading requests: {error}</p>
            </div>
          )}

          {!loading && !error && requests.length === 0 && (
            <div className="empty-state">
              <p>No cross-trade requests found.</p>
            </div>
          )}

          {/* Filter Controls */}
          <div className="filter-controls">
            <div className="filter-section">
              <span className="filter-label">Token</span>
              <div className="filter-buttons">
                <button className="filter-btn active">ALL</button>
                <button className="filter-btn">🔵 USDC</button>
                <button className="filter-btn">🟢 USDT</button>
                <button className="filter-btn">⚪ ETH</button>
                <button className="filter-btn">💎 TON</button>
              </div>
            </div>
            
            <div className="filter-section">
              <span className="filter-label">Reward On</span>
              <div className="filter-buttons">
                <button className="filter-btn active">All</button>
                <button className="filter-btn">🔵 Thanos</button>
                <button className="filter-btn">🔴 Optimism</button>
                <button className="filter-btn">🟢 Monica</button>
              </div>
            </div>
          </div>

          {/* Table Header */}
          <div className="table-container">
            <div className="table-header">
              <div className="header-cell token-col">Token</div>
              <div className="header-cell provide-col">Provide On</div>
              <div className="header-cell reward-col">Reward On</div>
              <div className="header-cell request-col">Request From</div>
              <div className="header-cell action-col"></div>
            </div>

            {/* Table Rows */}
            <div className="table-body">
              {requests.filter(req => req.data !== null).map((request, index) => {
                const data = request.data!
                const destinationChain = getChainName(data.l2DestinationChainId)
                const totalAmount = formatTokenAmount(data.totalAmount, data.l2SourceToken)
                const rewardAmount = formatTokenAmount(data.ctAmount, data.l2DestinationToken)
                const serviceFeeBigInt = data.totalAmount - data.ctAmount
                const serviceFeeAmount = formatTokenAmount(serviceFeeBigInt, data.l2SourceToken)
                const profitPercentage = ((Number(serviceFeeBigInt) / Number(data.totalAmount)) * 100).toFixed(2)

                return (
                  <div key={`request-${request.chainId}-${request.saleCount}`} className="table-row">
                    {/* Token Column */}
                    <div className="table-cell token-col">
                      <div className="token-info">
                        <span className="token-icon">{getTokenEmoji(data.l2SourceToken)}</span>
                        <span className="token-symbol">USDC</span>
                      </div>
                    </div>

                    {/* Provide On Column */}
                    <div className="table-cell provide-col">
                      <div className="amount-info">
                        <span className="amount-value">{totalAmount}</span>
                        <div className="chain-info">
                          <span className="chain-icon">⚪</span>
                          <span className="chain-name">Ethereum</span>
                        </div>
                      </div>
                    </div>

                    {/* Reward On Column */}
                    <div className="table-cell reward-col">
                      <div className="amount-info">
                        <span className="amount-value">{rewardAmount}</span>
                        <span className="profit-badge">+{profitPercentage}%</span>
                        <div className="chain-info">
                          <span className="chain-icon">{getChainEmoji(destinationChain)}</span>
                          <span className="chain-name">{destinationChain}</span>
                        </div>
                      </div>
                    </div>

                    {/* Request From Column */}
                    <div className="table-cell request-col">
                      <div className="chain-info">
                        <span className="chain-icon">{getChainEmoji(request.chainName)}</span>
                        <span className="chain-name">{request.chainName}</span>
                      </div>
                    </div>

                    {/* Action Column */}
                    <div className="table-cell action-col">
                      {request.data && connectedAddress && 
                       request.data.requester.toLowerCase() === connectedAddress.toLowerCase() ? (
                        <button 
                          className="pending-btn"
                          disabled
                          title="You cannot provide liquidity for your own request"
                        >
                          Pending
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleProvide(request)}
                          className="provide-btn"
                        >
                          Provide
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Refresh Buttons */}
          <div className="refresh-buttons">
            <button onClick={handleRefresh} className="refresh-button">
              Refresh
            </button>
            <button onClick={handleForceRefresh} className="refresh-button secondary">
              Full Refresh
            </button>
          </div>
        </div>
      </div>

      <footer className="footer">
        Copyright © 2025. All rights reserved.
      </footer>

      {/* Review Provide Modal */}
      {selectedRequest && selectedRequest.data && (
        <ReviewProvideModal
          isOpen={isProvideModalOpen}
          onClose={handleCloseProvideModal}
          requestData={{
            saleCount: selectedRequest.saleCount,
            chainId: selectedRequest.chainId,
            chainName: selectedRequest.chainName,
            l1token: selectedRequest.data.l1token,
            l2SourceToken: selectedRequest.data.l2SourceToken,
            l2DestinationToken: selectedRequest.data.l2DestinationToken,
            requester: selectedRequest.data.requester,
            receiver: selectedRequest.data.receiver,
            totalAmount: selectedRequest.data.totalAmount,
            ctAmount: selectedRequest.data.ctAmount,
            l1ChainId: selectedRequest.data.l1ChainId,
            l2DestinationChainId: selectedRequest.data.l2DestinationChainId,
            hashValue: selectedRequest.data.hashValue,
          }}
        />
      )}

      <style jsx>{`
        .request-pool-container {
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
          margin-bottom: 20px;
          text-align: center;
          max-width: 600px;
        }

        .debug-info {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 40px;
          text-align: center;
          padding: 8px 16px;
          background: rgba(20, 20, 20, 0.6);
          border-radius: 8px;
          border: 1px solid #333333;
        }

        .debug-info p {
          margin: 0;
        }

        .pool-container {
          width: 100%;
          max-width: 1200px;
        }

        .loading-state, .error-state, .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #9ca3af;
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
          flex-wrap: wrap;
        }

        .filter-btn {
          background: rgba(26, 26, 26, 0.8);
          border: 1px solid #333333;
          border-radius: 20px;
          padding: 6px 12px;
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
          grid-template-columns: 100px 1fr 1fr 100px 100px;
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
          grid-template-columns: 100px 1fr 1fr 100px 100px;
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

        .token-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .token-icon {
          font-size: 20px;
        }

        .token-symbol {
          color: #ffffff;
          font-size: 16px;
          font-weight: 600;
        }

        .amount-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .amount-value {
          color: #ffffff;
          font-size: 16px;
          font-weight: 600;
        }

        .chain-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .chain-icon {
          font-size: 14px;
        }

        .chain-name {
          color: #9ca3af;
          font-size: 12px;
        }

        .profit-badge {
          background: #10b981;
          color: #ffffff;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          margin-left: 8px;
        }

        .provide-btn {
          background: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .provide-btn:hover {
          background: #1d4ed8;
        }

        .pending-btn {
          background: #6b7280;
          color: #d1d5db;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: not-allowed;
          transition: all 0.2s ease;
        }

        .pending-btn:hover {
          background: #6b7280;
        }

        .refresh-buttons {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #333333;
        }

        .refresh-button {
          background: #6366f1;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .refresh-button:hover {
          background: #5855eb;
        }

        .refresh-button.secondary {
          background: rgba(26, 26, 26, 0.8);
          border: 1px solid #333333;
          color: #ffffff;
        }

        .refresh-button.secondary:hover {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.1);
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

        @media (max-width: 768px) {
          .filter-controls {
            flex-direction: column;
            gap: 16px;
          }
          
          .page-title {
            font-size: 28px;
          }
          
          .table-header,
          .table-row {
            grid-template-columns: 80px 1fr 1fr 80px 80px;
            gap: 8px;
            padding: 16px 12px;
          }
          
          .amount-value {
            font-size: 14px;
          }
          
          .chain-name {
            display: none;
          }
          
          .provide-btn,
          .pending-btn {
            padding: 6px 12px;
            font-size: 12px;
          }
        }

        @media (max-width: 480px) {
          .table-header,
          .table-row {
            grid-template-columns: 1fr;
            gap: 12px;
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
          
          .header-cell {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
