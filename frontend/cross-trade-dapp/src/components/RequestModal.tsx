'use client'

import { useState, useMemo } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { 
  l2_cross_trade_ABI,
  // L2_L2 specific imports
  getContractAddressFor_L2_L2,
  // L2_L1 specific imports
  getContractAddressFor_L2_L1,
} from '@/config/contracts'

interface RequestModalProps {
  isOpen: boolean
  onClose: () => void
}

export const RequestModal = ({ isOpen, onClose }: RequestModalProps) => {
  const chainId = useChainId() // Get current chain ID from wallet
  
  const [formData, setFormData] = useState({
    l1token: '',
    l2SourceToken: '',
    l2DestinationToken: '',
    receiver: '',
    totalAmount: '',
    ctAmount: '',
    l1ChainId: '11155111', // Default to Ethereum Sepolia
    l2DestinationChainId: ''
  })

  // Automatically detect communication mode based on destination chain
  const communicationMode = useMemo((): 'L2_L2' | 'L2_L1' => {
    if (!formData.l2DestinationChainId) return 'L2_L2'
    
    const destinationChainId = parseInt(formData.l2DestinationChainId)
    const l1ChainId = 11155111 // Ethereum Sepolia
    
    // If destination is Ethereum (L1) → L2_L1, otherwise → L2_L2
    return destinationChainId === l1ChainId ? 'L2_L1' : 'L2_L2'
  }, [formData.l2DestinationChainId])

  // Get contract address based on mode
  const contractAddress = useMemo(() => {
    if (communicationMode === 'L2_L1') {
      return getContractAddressFor_L2_L1(chainId, 'l2_cross_trade')
    } else {
      return getContractAddressFor_L2_L2(chainId, 'l2_cross_trade')
    }
  }, [chainId, communicationMode])

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.l1token || !formData.l2SourceToken || !formData.l2DestinationToken || 
        !formData.receiver || !formData.totalAmount || !formData.ctAmount || !formData.l1ChainId || !formData.l2DestinationChainId) {
      alert('Please fill in all fields')
      return
    }

    if (!contractAddress) {
      alert(`l2_cross_trade contract not found for chain ${chainId}. Please ensure you're connected to a supported network.`)
      return
    }

    console.log('📝 RequestModal - Creating request:', {
      mode: communicationMode,
      chainId,
      contractAddress,
      l1token: formData.l1token,
      l2SourceToken: formData.l2SourceToken,
      l2DestinationToken: formData.l2DestinationToken,
      receiver: formData.receiver,
      totalAmount: formData.totalAmount,
      ctAmount: formData.ctAmount,
      l1ChainId: formData.l1ChainId,
      l2DestinationChainId: formData.l2DestinationChainId,
      abi: 'l2_cross_trade_ABI',
      note: communicationMode === 'L2_L1' 
        ? 'L2→L1 mode: Uses L2_L1 config addresses' 
        : 'L2→L2 mode: Uses L2_L2 config addresses'
    })

    // Both L2_L2 and L2_L1 modes use the same L2 contract and ABI for creating requests
    // The difference is in the addresses used (from different configs)
    writeContract({
      address: contractAddress as `0x${string}`,
      abi: l2_cross_trade_ABI, // Same ABI for both modes (L2toL2CrossTradeL2.sol)
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Request Cross-Trade</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold px-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

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
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>
            {communicationMode === 'L2_L2' ? '🔄 L2 ↔ L2 Mode' : '🌉 L2 ↔ L1 Mode'}
          </span>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            {communicationMode === 'L2_L2' 
              ? 'Cross-chain between L2s' 
              : 'Bridge to L1 Ethereum'}
          </span>
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