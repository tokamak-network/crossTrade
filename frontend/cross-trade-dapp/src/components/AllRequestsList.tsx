'use client'

import { useState, useEffect } from 'react'
import { usePublicClient, useContractRead, useAccount, useWriteContract } from 'wagmi'
import { CONTRACTS } from '@/config/contracts'
import { PROVIDE_CT_ABI } from '@/config/contracts'

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

interface AllRequestsListProps {
  className?: string
}

const FULFILLED_KEY = 'fulfilledSaleCounts_v1'

const L1_CONTRACT_ADDRESS = '0xad18CB6e1B48667dA129953ff815d8f4aa7Da0A6'

export const AllRequestsList = ({ className = '' }: AllRequestsListProps) => {
  const [requests, setRequests] = useState<Array<{ saleCount: number; data: RequestData | null }>>([])
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
  const { address: connectedWallet } = useAccount()
  const { writeContract, isPending } = useWriteContract()
  const publicClient = usePublicClient()

  // Optimism Sepolia chain ID
  const CHAIN_ID = 111551119090

  // Get the current saleCount for this chain
  const { data: currentSaleCount } = useContractRead({
    address: CONTRACTS.L2_CROSS_TRADE,
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

  const fetchAllRequests = async (fullRefresh = false) => {
    if (!publicClient || !currentSaleCount) return

    setLoading(true)
    setError(null)

    try {
      const totalRequests = Number(currentSaleCount)
      const requestsArray: Array<{ saleCount: number; data: RequestData | null }> = []
      const newFulfilled = new Set<number>(fullRefresh ? [] : Array.from(fulfilledSaleCounts))

      for (let saleCount = 1; saleCount <= totalRequests; saleCount++) {
        if (!fullRefresh && fulfilledSaleCounts.has(saleCount)) continue // skip known fulfilled
        try {
          const data = await publicClient.readContract({
            address: CONTRACTS.L2_CROSS_TRADE,
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

          if (requestData.provider !== '0x0000000000000000000000000000000000000000') {
            newFulfilled.add(saleCount)
            continue // skip fulfilled
          }

          requestsArray.push({ saleCount, data: requestData })
        } catch {
          requestsArray.push({ saleCount, data: null })
        }
      }

      setRequests(requestsArray)
      setFulfilledSaleCounts(newFulfilled)
      if (typeof window !== 'undefined') {
        localStorage.setItem(FULFILLED_KEY, JSON.stringify(Array.from(newFulfilled)))
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentSaleCount && Number(currentSaleCount) > 0) {
      fetchAllRequests(forceRefresh)
      if (forceRefresh) setForceRefresh(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSaleCount, forceRefresh])

  const formatAmount = (amount: bigint) => {
    return (Number(amount) / 1e18).toFixed(18)
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
        <h3 className="text-xl font-bold mb-4">All Requests (by SaleCount)</h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading all requests...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
        <h3 className="text-xl font-bold mb-4">All Requests (by SaleCount)</h3>
        <div className="text-center text-red-600 py-4">{error}</div>
        <button
          onClick={() => fetchAllRequests(false)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          Retry
        </button>
      </div>
    )
  }

  const validRequests = requests.filter(req => req.data !== null && req.data.provider === '0x0000000000000000000000000000000000000000')

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">All Requests (by SaleCount)</h3>
        <div className="text-sm text-gray-600">
          Total: {validRequests.length} requests (Chain ID: {CHAIN_ID})
        </div>
      </div>

      {validRequests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No requests found
        </div>
      ) : (
        <div style={{ maxHeight: '24rem', overflowY: 'auto' }}>
          {validRequests.map(({ saleCount, data }, idx) => (
            <div
              key={saleCount}
              style={{
                borderBottom: idx !== validRequests.length - 1 ? '2px solid #d1d5db' : 'none',
                padding: '18px 0',
                margin: 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, color: '#2563eb', fontSize: 18 }}>SaleCount: {saleCount}</span>
                <span style={{ color: '#b45309', fontWeight: 500 }}>Pending</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
                <div>
                  <span style={{ fontWeight: 500, color: '#4b5563' }}>L1 Token:</span>
                  <span style={{ marginLeft: 8, fontFamily: 'monospace' }}>{data?.l1token}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 500, color: '#4b5563' }}>L2 Source Token:</span>
                  <span style={{ marginLeft: 8, fontFamily: 'monospace' }}>{data?.l2SourceToken}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 500, color: '#4b5563' }}>L2 Destination Token:</span>
                  <span style={{ marginLeft: 8, fontFamily: 'monospace' }}>{data?.l2DestinationToken}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 500, color: '#4b5563' }}>Requester:</span>
                  <span style={{ marginLeft: 8, fontFamily: 'monospace' }}>{data?.requester}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 500, color: '#4b5563' }}>Total Amount:</span>
                  <span style={{ marginLeft: 8 }}>{formatAmount(data?.totalAmount || BigInt(0))}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 500, color: '#4b5563' }}>CT Amount:</span>
                  <span style={{ marginLeft: 8 }}>{formatAmount(data?.ctAmount || BigInt(0))}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 500, color: '#4b5563' }}>L1 Chain ID:</span>
                  <span style={{ marginLeft: 8 }}>{data?.l1ChainId?.toString() || ''}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 500, color: '#4b5563' }}>L2 Destination Chain ID:</span>
                  <span style={{ marginLeft: 8 }}>{data?.l2DestinationChainId?.toString() || ''}</span>
                </div>
                <div style={{ gridColumn: '1 / span 2' }}>
                  <span style={{ fontWeight: 500, color: '#4b5563' }}>Hash:</span>
                  <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: 12 }}>
                    {data?.hashValue}
                  </span>
                  {/* Provide button if not requester */}
                  {connectedWallet &&
                    data &&
                    data.requester?.toLowerCase() !== connectedWallet.toLowerCase() &&
                    data.l1token &&
                    data.l2SourceToken &&
                    data.l2DestinationToken &&
                    data.requester &&
                    typeof data.totalAmount === 'bigint' &&
                    typeof data.ctAmount === 'bigint' &&
                    typeof data.l2DestinationChainId === 'bigint' &&
                    data.hashValue && (
                      <button
                        style={{ marginLeft: 24, padding: '6px 18px', border: '1px solid #2563eb', borderRadius: 6, background: '#2563eb', color: '#fff', fontWeight: 500, cursor: 'pointer' }}
                        disabled={isPending}
                        onClick={async () => {
                          writeContract({
                            address: L1_CONTRACT_ADDRESS,
                            abi: PROVIDE_CT_ABI,
                            functionName: 'provideCT',
                            chainId: 1,
                            value: data.l1token === '0x0000000000000000000000000000000000000000' ? data.ctAmount : BigInt(0),
                            args: [
                              data.l1token as `0x${string}`,
                              data.l2SourceToken as `0x${string}`,
                              data.l2DestinationToken as `0x${string}`,
                              data.requester as `0x${string}`,
                              data.totalAmount,
                              data.ctAmount,
                              BigInt(saleCount),
                              BigInt(10), // l2SourceChainId (Optimism)
                              data.l2DestinationChainId,
                              200000, // minGasLimit
                              data.hashValue as `0x${string}`
                            ]
                          })
                        }}
                      >
                        {isPending ? 'Providing...' : 'Provide'}
                      </button>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-center">
        <button
          onClick={() => fetchAllRequests(false)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          Refresh
        </button>
        <button
          onClick={() => setForceRefresh(true)}
          style={{ marginLeft: 12, padding: '8px 18px', border: '1px solid #888', borderRadius: 6, background: '#fff', color: '#222', fontWeight: 500, cursor: 'pointer' }}
        >
          Full Refresh
        </button>
      </div>
    </div>
  )
} 