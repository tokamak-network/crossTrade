'use client'

import { useState } from 'react'
import { usePublicClient, useChainId } from 'wagmi'
import { 
  REQUEST_CT_EVENT_ABI,
  getContractAddressFor_L2_L2,
  getContractAddressFor_L2_L1
} from '@/config/contracts'

interface RequestDetailsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const RequestDetailsModal = ({ isOpen, onClose }: RequestDetailsModalProps) => {
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const [saleCount, setSaleCount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [event, setEvent] = useState<any | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setEvent(null)
    if (!publicClient) return
    if (!saleCount || isNaN(Number(saleCount))) {
      setError('Please enter a valid SaleCount number.')
      return
    }

    // Try to get contract address from either config
    const contractAddress = getContractAddressFor_L2_L2(chainId, 'L2_CROSS_TRADE') || 
                           getContractAddressFor_L2_L1(chainId, 'L2_CROSS_TRADE')

    if (!contractAddress) {
      setError(`L2_CROSS_TRADE contract not found for chain ${chainId}. Please ensure you're connected to a supported network.`)
      return
    }

    setLoading(true)
    try {
      const latestBlock = await publicClient.getBlock()
      const fromBlock = latestBlock.number > BigInt(50000) ? latestBlock.number - BigInt(50000) : BigInt(0)
      const logs = await publicClient.getLogs({
        address: contractAddress as `0x${string}`,
        event: REQUEST_CT_EVENT_ABI[0],
        fromBlock,
        toBlock: 'latest',
        args: { _saleCount: BigInt(saleCount) },
      })
      if (logs.length === 0) {
        setError('No request found for this SaleCount in the last 50,000 blocks.')
      } else {
        setEvent(logs[0])
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch event')
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Request Details by SaleCount</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold px-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
          <label className="block text-base font-semibold text-gray-800">
            Enter SaleCount
            <input
              type="number"
              value={saleCount}
              onChange={e => setSaleCount(e.target.value)}
              className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-gray-50"
              placeholder="e.g. 10"
              min={1}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Show Request'}
          </button>
        </form>
        {error && <div className="text-center text-red-600 mb-4">{error}</div>}
        {event && (
          <div>
            <h3 className="text-lg font-bold mb-2">Recent Cross-Trade Request</h3>
            <div className="font-mono text-xs text-gray-400 mb-2">Tx: {event.transactionHash}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="font-semibold">L1 Token:</div>
              <div>{event.args._l1token}</div>
              <div className="font-semibold">L2 Source Token:</div>
              <div>{event.args._l2SourceToken}</div>
              <div className="font-semibold">L2 Destination Token:</div>
              <div>{event.args._l2DestinationToken}</div>
              <div className="font-semibold">Requester:</div>
              <div>{event.args._requester}</div>
              <div className="font-semibold">Receiver:</div>
              <div>{event.args._receiver}</div>
              <div className="font-semibold">Total Amount:</div>
              <div>{event.args._totalAmount.toString()}</div>
              <div className="font-semibold">CT Amount:</div>
              <div>{event.args._ctAmount.toString()}</div>
              <div className="font-semibold">Sale Count:</div>
              <div>{event.args._saleCount.toString()}</div>
              <div className="font-semibold">L1 Chain ID:</div>
              <div>{event.args._l1ChainId.toString()}</div>
              <div className="font-semibold">L2 Source Chain ID:</div>
              <div>{event.args._l2SourceChainId.toString()}</div>
              <div className="font-semibold">L2 Destination Chain ID:</div>
              <div>{event.args._l2DestinationChainId.toString()}</div>
              <div className="font-semibold">Hash Value:</div>
              <div className="break-all">{event.args._hashValue}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 