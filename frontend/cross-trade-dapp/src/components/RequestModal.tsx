'use client'

import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACTS, L2_CROSS_TRADE_ABI } from '@/config/contracts'

interface RequestModalProps {
  isOpen: boolean
  onClose: () => void
}

export const RequestModal = ({ isOpen, onClose }: RequestModalProps) => {
  const [formData, setFormData] = useState({
    l1token: '',
    l2SourceToken: '',
    l2DestinationToken: '',
    receiver: '',
    totalAmount: '',
    ctAmount: '',
    l1ChainId: '',
    l2DestinationChainId: ''
  })

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.l1token || !formData.l2SourceToken || !formData.l2DestinationToken || 
        !formData.receiver || !formData.totalAmount || !formData.ctAmount || !formData.l1ChainId || !formData.l2DestinationChainId) {
      alert('Please fill in all fields')
      return
    }

    writeContract({
      address: CONTRACTS.L2_CROSS_TRADE as `0x${string}`,
      abi: L2_CROSS_TRADE_ABI,
      functionName: 'requestRegisteredToken',
      args: [
        formData.l1token as `0x${string}`,
        formData.l2SourceToken as `0x${string}`,
        formData.l2DestinationToken as `0x${string}`,
        formData.receiver as `0x${string}`,
        BigInt(formData.totalAmount),
        BigInt(formData.ctAmount),
        BigInt(formData.l1ChainId),
        BigInt(formData.l2DestinationChainId)
      ],
      value: formData.l2SourceToken === '0x0000000000000000000000000000000000000000' ? BigInt(formData.totalAmount) : BigInt(0)
    })
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Request Cross-Trade</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold px-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-base font-semibold text-gray-800">
              L1 Token Address
            </label>
            <input
              type="text"
              value={formData.l1token}
              onChange={(e) => handleInputChange('l1token', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-gray-50"
              placeholder="0x..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-base font-semibold text-gray-800">
              L2 Source Token Address
            </label>
            <input
              type="text"
              value={formData.l2SourceToken}
              onChange={(e) => handleInputChange('l2SourceToken', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-gray-50"
              placeholder="0x..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-base font-semibold text-gray-800">
              L2 Destination Token Address
            </label>
            <input
              type="text"
              value={formData.l2DestinationToken}
              onChange={(e) => handleInputChange('l2DestinationToken', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-gray-50"
              placeholder="0x..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-base font-semibold text-gray-800">
              Receiver Address
            </label>
            <input
              type="text"
              value={formData.receiver}
              onChange={(e) => handleInputChange('receiver', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-gray-50"
              placeholder="0x..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-base font-semibold text-gray-800">
              Total Amount
            </label>
            <input
              type="number"
              value={formData.totalAmount}
              onChange={(e) => handleInputChange('totalAmount', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-gray-50"
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-base font-semibold text-gray-800">
              CT Amount
            </label>
            <input
              type="number"
              value={formData.ctAmount}
              onChange={(e) => handleInputChange('ctAmount', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-gray-50"
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-base font-semibold text-gray-800">
              L1 Chain ID
            </label>
            <input
              type="number"
              value={formData.l1ChainId}
              onChange={(e) => handleInputChange('l1ChainId', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-gray-50"
              placeholder="11155111"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-base font-semibold text-gray-800">
              L2 Destination Chain ID
            </label>
            <input
              type="number"
              value={formData.l2DestinationChainId}
              onChange={(e) => handleInputChange('l2DestinationChainId', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-gray-50"
              placeholder="111551119090"
            />
          </div>

          <div className="flex space-x-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || isConfirming}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50"
            >
              {isPending ? 'Requesting...' : isConfirming ? 'Confirming...' : 'Submit Request'}
            </button>
          </div>
        </form>

        {isSuccess && (
          <hr className="my-6" />
        )}
        {isSuccess && (
          <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-center">
            Transaction successful!<br />
            <span className="break-all">Hash: {hash}</span>
          </div>
        )}
      </div>
    </div>
  )
} 