'use client'

import { useEffect, useState } from 'react'
import { usePublicClient, useChainId } from 'wagmi'
import { 
  REQUEST_CT_EVENT_ABI,
  getContractAddressFor_L2_L2,
  getContractAddressFor_L2_L1
} from '@/config/contracts'

// Helper: get block number for N days ago (approximate)
async function getBlockNumberNDaysAgo(client: any, days: number) {
  const latestBlock = await client.getBlock()
  // Ethereum average block time: ~12s, L2s may be faster
  const blocksAgo = Math.floor((days * 24 * 60 * 60) / 12)
  return latestBlock.number - BigInt(blocksAgo)
}

export const RequestsList = () => {
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      if (!publicClient) return

      // Get contract address from config
      const contractAddress = getContractAddressFor_L2_L2(chainId, 'L2_CROSS_TRADE') || 
                             getContractAddressFor_L2_L1(chainId, 'L2_CROSS_TRADE')

      if (!contractAddress) {
        setError(`L2_CROSS_TRADE contract not found for chain ${chainId}`)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const latestBlock = await publicClient.getBlock()
        const fromBlock = latestBlock.number > BigInt(50000) ? latestBlock.number - BigInt(50000) : BigInt(0)
        const logs = await publicClient.getLogs({
          address: contractAddress as `0x${string}`,
          event: REQUEST_CT_EVENT_ABI[0],
          fromBlock,
          toBlock: 'latest',
        })
        setEvents(logs)
      } catch (e: any) {
        setError(e.message || 'Failed to fetch events')
      }
      setLoading(false)
    }
    fetchEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, chainId])

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-6 text-center">Recent Cross-Trade Requests</h2>
      {!publicClient && <div className="text-center text-red-600">No public client available.</div>}
      {loading && <div className="text-center">Loading...</div>}
      {error && <div className="text-center text-red-600">{error}</div>}
      {(!loading && events.length === 0) && <div className="text-center text-gray-500">No requests found in the last 2 months.</div>}
      <div className="space-y-6">
        {events.map((ev, idx) => (
          <div key={ev.transactionHash + idx} className="border rounded-lg p-4 bg-white shadow">
            <div className="font-mono text-xs text-gray-400 mb-2">Tx: {ev.transactionHash}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="font-semibold">L1 Token:</div>
              <div>{ev.args._l1token}</div>
              <div className="font-semibold">L2 Source Token:</div>
              <div>{ev.args._l2SourceToken}</div>
              <div className="font-semibold">L2 Destination Token:</div>
              <div>{ev.args._l2DestinationToken}</div>
              <div className="font-semibold">Requester:</div>
              <div>{ev.args._requester}</div>
              <div className="font-semibold">Total Amount:</div>
              <div>{ev.args._totalAmount.toString()}</div>
              <div className="font-semibold">CT Amount:</div>
              <div>{ev.args._ctAmount.toString()}</div>
              <div className="font-semibold">Sale Count:</div>
              <div>{ev.args._saleCount.toString()}</div>
              <div className="font-semibold">L1 Chain ID:</div>
              <div>{ev.args._l1ChainId.toString()}</div>
              <div className="font-semibold">L2 Source Chain ID:</div>
              <div>{ev.args._l2SourceChainId.toString()}</div>
              <div className="font-semibold">L2 Destination Chain ID:</div>
              <div>{ev.args._l2DestinationChainId.toString()}</div>
              <div className="font-semibold">Hash Value:</div>
              <div className="break-all">{ev.args._hashValue}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 