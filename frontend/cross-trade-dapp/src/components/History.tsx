'use client'

import { useEffect, useState } from 'react'
import { useAccount, usePublicClient, useContractRead } from 'wagmi'
import { createPublicClient, http, defineChain } from 'viem'
import Image from 'next/image'
import {
  CHAIN_CONFIG_L2_L2,
  CHAIN_CONFIG_L2_L1,
  getTokenDecimals,
  // L2_L2 specific imports
  getChainsFor_L2_L2,
  getContractAddressFor_L2_L2,
  // L2_L1 specific imports
  getChainsFor_L2_L1,
  getContractAddressFor_L2_L1,
  // L2_L1 ABIs
  L2_L1_PROVIDE_CT_ABI,
  L2_L1_CANCEL_CT_ABI,
  L2_L1_EDIT_FEE_ABI
} from '@/config/contracts'
import { Navigation } from './Navigation'
import { EditFeeModal } from './EditFeeModal'
import { CancelCTModal } from './CancelCTModal'
import { getChainLogo, getTokenLogo } from '@/utils/chainLogos'

interface RequestData {
  l1token: string
  l2SourceToken: string
  l2DestinationToken: string
  requester: string
  receiver: string
  provider: string
  totalAmount: bigint
  ctAmount: bigint
  editedCtAmount?: bigint // Edited amount from L1 (if edited)
  l1ChainId: bigint
  l2DestinationChainId: bigint
  hashValue: string
}

interface HistoryRequest {
  saleCount: number
  chainId: number
  chainName: string
  data: RequestData | null
  status: 'Completed' | 'Waiting' | 'Cancelled'
  type: 'Provide' | 'Request'
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
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Get all L2 chains that have l2_cross_trade contracts from both L2_L2 and L2_L1 configs
  const getL2Chains = () => {
    // Get chains from both configs
    const l2l2Chains = getChainsFor_L2_L2().filter(({ chainId, config }) => 
      config.contracts.l2_cross_trade && 
      config.contracts.l2_cross_trade !== '' &&
      chainId !== 11155111 // Exclude Ethereum Sepolia (L1)
    ).map(chain => ({ ...chain, type: 'L2_L2' as const }))
    
    const l2l1Chains = getChainsFor_L2_L1().filter(({ chainId, config }) => 
      config.contracts.l2_cross_trade && 
      config.contracts.l2_cross_trade !== '' &&
      chainId !== 11155111 // Exclude Ethereum Sepolia (L1)
    ).map(chain => ({ ...chain, type: 'L2_L1' as const }))
    
    // Combine both types
    const allChains = [...l2l2Chains, ...l2l1Chains]
    
    console.log('📊 History - L2 Chains loaded:', {
      l2l2Count: l2l2Chains.length,
      l2l1Count: l2l1Chains.length,
      totalCount: allChains.length,
      chains: allChains.map(c => ({ chainId: c.chainId, name: c.config.display_name, type: c.type }))
    })
    
    return allChains
  }

  const l2Chains = getL2Chains()

  // Helper function to determine communication mode based on destination chain
  const getCommunicationMode = (destinationChainId: number): 'L2_L2' | 'L2_L1' => {
    const l1ChainId = 11155111 // Ethereum Sepolia
    return destinationChainId === l1ChainId ? 'L2_L1' : 'L2_L2'
  }

  // Mode-aware helper to get contract address
  const getContractAddressForMode = (chainId: number, contractName: string, destinationChainId: number) => {
    const mode = getCommunicationMode(destinationChainId)
    
    // Each mode strictly uses its own config - no fallbacks
    if (mode === 'L2_L2') {
      return getContractAddressFor_L2_L2(chainId, contractName)
    } else {
      return getContractAddressFor_L2_L1(chainId, contractName)
    }
  }

  // Helper function to create chain-specific publicClient
  const getPublicClientForChain = (chainId: number) => {
    // Get RPC URL from config
    const chainIdStr = chainId.toString()
    const configL2L2 = CHAIN_CONFIG_L2_L2[chainIdStr]
    const configL2L1 = CHAIN_CONFIG_L2_L1[chainIdStr]
    
    const rpcUrl = configL2L2?.rpc_url || configL2L1?.rpc_url
    
    if (!rpcUrl) {
      throw new Error(`No RPC URL configured for chain ${chainId}`)
    }

    // Create a dedicated publicClient for this specific chain
    const chainConfig = defineChain({
      id: chainId,
      name: `Chain ${chainId}`,
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: { http: [rpcUrl] }
      }
    })

    return createPublicClient({
      chain: chainConfig,
      transport: http(rpcUrl)
    })
  }

  // Helper function to format token amounts with proper decimals
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
    const chainIdStr = chainIdNum.toString()
    // Try L2_L2 config first, then L2_L1
    const config = CHAIN_CONFIG_L2_L2[chainIdStr] || CHAIN_CONFIG_L2_L1[chainIdStr]
    return config?.display_name || `Chain ${chainId}`
  }

  // Helper function to render chain icon
  const renderChainIcon = (chainName: string) => {
    const logoSrc = getChainLogo(chainName)
    return (
      <Image
        src={logoSrc}
        alt={chainName}
        width={16}
        height={16}
        style={{ borderRadius: '50%', objectFit: 'cover' }}
      />
    )
  }

  // Helper function to get token symbol from address
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

  // Helper function to render token icon
  const renderTokenIcon = (tokenSymbol: string) => {
    const logoSrc = getTokenLogo(tokenSymbol)
    return (
      <Image
        src={logoSrc}
        alt={tokenSymbol}
        width={16}
        height={16}
        style={{ borderRadius: '50%', objectFit: 'cover' }}
      />
    )
  }

  // Helper function to get edited ctAmount from L1 contract
  const getEditedCtAmount = async (hashValue: string, contractType: 'L2_L2' | 'L2_L1'): Promise<bigint | null> => {
    try {
      // L1 is always Ethereum Sepolia (chainId 11155111)
      const l1ChainId = 11155111
      
      // Get L1 contract address based on contract type
      let l1ContractAddress: string | undefined
      
      if (contractType === 'L2_L2') {
        // For L2_L2, use CHAIN_CONFIG_L2_L2 to get l1_cross_trade address
        const l1Config = CHAIN_CONFIG_L2_L2[l1ChainId]
        l1ContractAddress = l1Config?.contracts.l1_cross_trade
      } else {
        // For L2_L1, use CHAIN_CONFIG_L2_L1 to get l1_cross_trade address
        const l1Config = CHAIN_CONFIG_L2_L1[l1ChainId]
        l1ContractAddress = l1Config?.contracts.l1_cross_trade
      }
      
      if (!l1ContractAddress) {
        console.warn(`L1 contract address not found for ${contractType}`)
        return null
      }

      // Create L1-specific client
      const l1Client = getPublicClientForChain(l1ChainId)
      
      // Query editCtAmount mapping
      const editedAmount = await l1Client.readContract({
        address: l1ContractAddress as `0x${string}`,
        abi: [
          {
            inputs: [{ type: 'bytes32', name: '' }],
            name: 'editCtAmount',
            outputs: [{ type: 'uint256', name: '' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'editCtAmount',
        args: [hashValue as `0x${string}`],
      }) as bigint

      // Return edited amount if it's non-zero, otherwise null
      return editedAmount > BigInt(0) ? editedAmount : null
    } catch (err) {
      console.error('Error fetching edited ctAmount from L1:', err)
      return null
    }
  }

  // Helper function to generate random status (unused - kept for backward compatibility)
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
    if (!publicClient || !userAddress) return

// Add a small delay to ensure wallet is fully ready
    await new Promise(resolve => setTimeout(resolve, 1000))

    setLoading(true)
    setError(null)

    try {
      const userHistory: HistoryRequest[] = []

// Get all possible destination chain IDs (all L2 chains + L1)
      const allDestinationChainIds = [
        ...l2Chains.map(chain => chain.chainId),
        11155111 // Ethereum Sepolia (L1)
      ]

      // Fetch history from all L2 chains - Handle both L2_L2 and L2_L1
      for (const { chainId: sourceChainId, config, type: contractType } of l2Chains) {
        const contractAddress = config.contracts.l2_cross_trade
        if (!contractAddress || contractAddress === '') continue

        try {
          if (contractType === 'L2_L2') {
            // L2_L2 contract: has separate saleCountChainId per destination
            for (const destinationChainId of allDestinationChainIds) {
              try {
                // Create chain-specific publicClient for this contract call
                const chainSpecificClient = getPublicClientForChain(sourceChainId)
                
                const currentSaleCount = await chainSpecificClient.readContract({
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
                  try {
                    // Use the same chain-specific client for consistency
                    const chainSpecificClient = getPublicClientForChain(sourceChainId)
                    
                    const data = await chainSpecificClient.readContract({
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

                    // Check if user is involved (as requester or provider)
                    const isRequester = requestData.requester.toLowerCase() === userAddress.toLowerCase()
                    const isProvider = requestData.provider.toLowerCase() === userAddress.toLowerCase() && 
                                      requestData.provider !== '0x0000000000000000000000000000000000000000'

                    if (isRequester || isProvider) {
                      // Check for edited ctAmount on L1
                      const editedCtAmount = await getEditedCtAmount(requestData.hashValue, 'L2_L2')
                      if (editedCtAmount) {
                        console.log(`📝 Found edited ctAmount for hash ${requestData.hashValue}: ${editedCtAmount.toString()}`)
                        requestData.editedCtAmount = editedCtAmount
                      }

                      // Determine status based on provider
                      let status: 'Completed' | 'Waiting' | 'Cancelled'
                      if (requestData.provider !== '0x0000000000000000000000000000000000000000') {
                        // Check if provider equals receiver - this indicates cancellation
                        if (requestData.provider.toLowerCase() === requestData.receiver.toLowerCase()) {
                          status = 'Cancelled'
                        } else {
                          status = 'Completed'
                        }
                      } else {
                        status = 'Waiting'
                      }

                      userHistory.push({
                        saleCount,
                        chainId: sourceChainId,
                        chainName: config.display_name,
                        data: requestData,
                        status,
                        type: isProvider ? 'Provide' : 'Request',
                      })
                    }
                  } catch (err) {
                    // Silently skip if dealData function doesn't exist or returns no data
                    if ((err as any)?.message?.includes('returned no data')) {
                      continue
                    }
                  }
                }
              } catch (err) {
                // Silently skip if saleCountChainId function doesn't exist
                if ((err as any)?.message?.includes('returned no data') || (err as any)?.message?.includes('saleCountChainId')) {
                  continue
                }
              }
            }
          } else if (contractType === 'L2_L1') {
            // L2_L1 contract: has single saleCount for all requests
            try {
              const chainSpecificClient = getPublicClientForChain(sourceChainId)
              
              // Get the total saleCount (not per destination)
              const currentSaleCount = await chainSpecificClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: [
                  {
                    inputs: [],
                    name: 'saleCount',
                    outputs: [{ type: 'uint256', name: '' }],
                    stateMutability: 'view',
                    type: 'function',
                  },
                ],
                functionName: 'saleCount',
              }) as bigint

              const totalRequests = Number(currentSaleCount)

              // Fetch all requests
              for (let saleCount = 1; saleCount <= totalRequests; saleCount++) {
                try {
                  const chainSpecificClient = getPublicClientForChain(sourceChainId)
                  
                  const data = await chainSpecificClient.readContract({
                    address: contractAddress as `0x${string}`,
                    abi: [
                      {
                        inputs: [{ type: 'uint256', name: 'saleCount' }],
                        name: 'dealData',
                        outputs: [
                          { type: 'address', name: 'l1token' },
                          { type: 'address', name: 'l2token' },
                          { type: 'address', name: 'requester' },
                          { type: 'address', name: 'receiver' },
                          { type: 'address', name: 'provider' },
                          { type: 'uint256', name: 'totalAmount' },
                          { type: 'uint256', name: 'ctAmount' },
                          { type: 'uint256', name: 'chainId' },
                          { type: 'bytes32', name: 'hashValue' },
                        ],
                        stateMutability: 'view',
                        type: 'function',
                      },
                    ],
                    functionName: 'dealData',
                    args: [BigInt(saleCount)],
                  }) as readonly [string, string, string, string, string, bigint, bigint, bigint, string]

                  // Convert the tuple to RequestData object
                  // For L2_L1: l2token is both source and destination, chainId is L1 destination
                  const requestData: RequestData = {
                    l1token: data[0],
                    l2SourceToken: data[1],
                    l2DestinationToken: data[1], // Same as source for L2_L1
                    requester: data[2],
                    receiver: data[3],
                    provider: data[4],
                    totalAmount: data[5],
                    ctAmount: data[6],
                    l1ChainId: data[7], // This is the destination L1 chain
                    l2DestinationChainId: data[7], // Store as destination for consistency
                    hashValue: data[8],
                  }

                  // Check if user is involved (as requester or provider)
                  const isRequester = requestData.requester.toLowerCase() === userAddress.toLowerCase()
                  const isProvider = requestData.provider.toLowerCase() === userAddress.toLowerCase() && 
                                    requestData.provider !== '0x0000000000000000000000000000000000000000'

                  if (isRequester || isProvider) {
                    // Check for edited ctAmount on L1
                    const editedCtAmount = await getEditedCtAmount(requestData.hashValue, 'L2_L1')
                    if (editedCtAmount) {
                      console.log(`📝 Found edited ctAmount for hash ${requestData.hashValue}: ${editedCtAmount.toString()}`)
                      requestData.editedCtAmount = editedCtAmount
                    }

                    // Determine status based on provider
                    let status: 'Completed' | 'Waiting' | 'Cancelled'
                    if (requestData.provider !== '0x0000000000000000000000000000000000000000') {
                      // Check if provider equals receiver - this indicates cancellation
                      if (requestData.provider.toLowerCase() === requestData.receiver.toLowerCase()) {
                        status = 'Cancelled'
                      } else {
                        status = 'Completed'
                      }
                    } else {
                      status = 'Waiting'
                    }

                    userHistory.push({
                      saleCount,
                      chainId: sourceChainId,
                      chainName: config.display_name,
                      data: requestData,
                      status,
                      type: isProvider ? 'Provide' : 'Request',
                    })
                  }
                } catch (err) {
                  // Silently skip if dealData function doesn't exist or returns no data
                  if ((err as any)?.message?.includes('returned no data')) {
                    continue
                  }
                }
              }
            } catch (err) {
              // Silently skip if saleCount function doesn't exist
              if ((err as any)?.message?.includes('returned no data') || (err as any)?.message?.includes('saleCount')) {
                continue
              }
            }
          }
        } catch (err) {
          // Outer catch for any unexpected errors
          console.error(`Error fetching from ${config.display_name}:`, err)
        }
      }

      // Sort by date (newest first)
      userHistory.sort((a, b) => b.saleCount - a.saleCount)
      setHistoryRequests(userHistory)

    } catch (err: any) {
      setError(err.message || 'Failed to fetch history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userAddress && l2Chains.length > 0) {
      fetchUserHistory()
    }
  }, [userAddress, l2Chains.length])

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

  const handleCancel = (request: HistoryRequest) => {
    if (request.type !== 'Request') {
      alert('You can only cancel your own requests')
      return
    }
    setSelectedRequest(request)
    setIsCancelModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedRequest(null)
  }

  const handleCloseCancelModal = () => {
    setIsCancelModalOpen(false)
    setSelectedRequest(null)
  }

  const toggleRowExpanded = (rowKey: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(rowKey)) {
        next.delete(rowKey)
      } else {
        next.add(rowKey)
      }
      return next
    })
  }

  const truncateAddress = (address: string, chars: number = 6) => {
    if (!address) return ''
    if (address.length <= chars + 4) return address
    return `${address.slice(0, chars)}...${address.slice(-4)}`
  }

  const formatHash = (hash: string) => {
    if (!hash) return ''
    if (hash.length <= 18) return hash
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`
  }

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)

  const getExplorerUrl = (chainId: number, hash: string) => {
    const config = CHAIN_CONFIG_L2_L2[chainId.toString()] || CHAIN_CONFIG_L2_L1[chainId.toString()]
    return config?.block_explorer_url ? `${config.block_explorer_url}/tx/${hash}` : null
  }

  const DetailRow = ({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) => (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className={`detail-value ${className}`}>{value}</span>
    </div>
  )

  const CopyableAddress = ({ address, label }: { address: string; label: string }) => (
    <DetailRow
      label={label}
      value={
        <span className="copyable" onClick={(e) => { e.stopPropagation(); copyToClipboard(address) }} title={address}>
          {truncateAddress(address)}
        </span>
      }
    />
  )

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
        
        {/* Debug info - show which chains are being queried
        <div className="debug-info">
          <p>Querying {l2Chains.length} L2 chains: {l2Chains.map(chain => `${chain.config.display_name} (${chain.type})`).join(', ')}</p>
        </div>
        */}

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
                  <div className="header-cell expand-col"></div>
                  <div className="header-cell type-col">Type</div>
                  <div className="header-cell token-col">Token</div>
                  <div className="header-cell from-col">Network From</div>
                  <div className="header-cell to-col">Network To</div>
                  <div className="header-cell status-col">Status</div>
                  <div className="header-cell action-col">Action</div>
                </div>

                <div className="table-body">
                  {filteredRequests.map((request, index) => {
                    const data = request.data!
                    const rowKey = `history-${request.chainId}-${request.saleCount}-${index}`
                    const isExpanded = expandedRows.has(rowKey)
                    const tokenSymbol = getTokenSymbol(data.l2SourceToken)
                    const tokenIcon = renderTokenIcon(tokenSymbol)
                    // Use edited amount if available, otherwise use original ctAmount
                    const actualCtAmount = data.editedCtAmount || data.ctAmount
                    const amount = formatTokenAmount(actualCtAmount, data.l2SourceToken)
                    const originalAmount = formatTokenAmount(data.ctAmount, data.l2SourceToken)
                    const totalAmount = formatTokenAmount(data.totalAmount, data.l2SourceToken)
                    const hasEdited = data.editedCtAmount !== undefined && data.editedCtAmount !== data.ctAmount
                    const fromChain = request.type === 'Provide'
                      ? getChainName(BigInt(11155111)) // Ethereum for provides
                      : request.chainName // Source chain from request data
                    const toChain = getChainName(data.l2DestinationChainId)
                    const reward = data.totalAmount - actualCtAmount
                    const rewardAmount = formatTokenAmount(reward, data.l2SourceToken)

                    return (
                      <div key={rowKey} className={`table-row-wrapper ${isExpanded ? 'expanded' : ''}`}>
                        <div
                          className="table-row"
                          onClick={() => toggleRowExpanded(rowKey)}
                        >
                          {/* Expand Indicator */}
                          <div className="expand-indicator">
                            <svg
                              className={`chevron ${isExpanded ? 'rotated' : ''}`}
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                            >
                              <path
                                d="M3 4.5L6 7.5L9 4.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>

                          {/* Type Column */}
                          <div className="table-cell type-col">
                            <span className={`type-badge ${request.type.toLowerCase()}`}>
                              {request.type}
                            </span>
                          </div>

                          {/* Token Column */}
                          <div className="table-cell token-col">
                            <div className="token-info">
                              <span className="token-icon">{tokenIcon}</span>
                              <div className="token-details">
                                <span className="token-amount">
                                  {amount}
                                  {hasEdited && <span className="edited-badge">EDITED</span>}
                                </span>
                                <span className="token-symbol">{tokenSymbol}</span>
                              </div>
                            </div>
                          </div>

                          {/* Network From Column */}
                          <div className="table-cell from-col">
                            <div className="network-info">
                              <span className="network-icon">{renderChainIcon(fromChain)}</span>
                              <span className="network-name">{fromChain}</span>
                            </div>
                          </div>

                          {/* Network To Column */}
                          <div className="table-cell to-col">
                            <div className="network-info">
                              <span className="network-icon">{renderChainIcon(toChain)}</span>
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

                          {/* Action Column */}
                          <div className="table-cell action-col">
                            {request.status === 'Waiting' && request.type === 'Request' && (
                              <div className="action-buttons">
                                <button
                                  className="edit-btn"
                                  onClick={(e) => { e.stopPropagation(); handleEdit(request) }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="cancel-btn"
                                  onClick={(e) => { e.stopPropagation(); handleCancel(request) }}
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className={`expanded-details ${isExpanded ? 'show' : ''}`}>
                          <div className="expanded-details-inner">
                            <div className="details-grid">
                              <div className="detail-section">
                                <h4 className="section-title">Amounts</h4>
                                <DetailRow label="Total" value={`${totalAmount} ${tokenSymbol}`} />
                                <DetailRow label="Bridge" value={`${amount} ${tokenSymbol}`} />
                                {hasEdited && <DetailRow label="Original" value={`${originalAmount} ${tokenSymbol}`} className="muted" />}
                                {request.status !== 'Cancelled' && (
                                  <DetailRow label="Reward" value={`+${rewardAmount} ${tokenSymbol}`} className="profit" />
                                )}
                              </div>

                              <div className="detail-section">
                                <h4 className="section-title">Addresses</h4>
                                <CopyableAddress label="Requester" address={data.requester} />
                                <CopyableAddress label="Receiver" address={data.receiver} />
                                {data.provider.toLowerCase() !== '0x0000000000000000000000000000000000000000' && (
                                  <CopyableAddress label="Provider" address={data.provider} />
                                )}
                              </div>

                              <div className="detail-section">
                                <h4 className="section-title">Transaction</h4>
                                <DetailRow label="ID" value={`#${request.saleCount}`} />
                                <DetailRow label="Route" value={`${request.chainName} → ${toChain}`} />
                                <DetailRow
                                  label="Hash"
                                  value={
                                    <span className="hash-value">
                                      <span className="copyable" onClick={(e) => { e.stopPropagation(); copyToClipboard(data.hashValue) }} title={data.hashValue}>
                                        {formatHash(data.hashValue)}
                                      </span>
                                      {getExplorerUrl(request.chainId, data.hashValue) && (
                                        <a href={getExplorerUrl(request.chainId, data.hashValue)!} target="_blank" rel="noopener noreferrer" className="explorer-link" onClick={(e) => e.stopPropagation()}>↗</a>
                                      )}
                                    </span>
                                  }
                                />
                              </div>

                              {request.status === 'Waiting' && request.type === 'Request' && (
                                <div className="detail-section actions-section">
                                  <h4 className="section-title">Actions</h4>
                                  <div className="detail-actions">
                                    <button className="edit-btn" onClick={(e) => { e.stopPropagation(); handleEdit(request) }}>Edit Request</button>
                                    <button className="cancel-btn" onClick={(e) => { e.stopPropagation(); handleCancel(request) }}>Cancel Request</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
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
            requester: selectedRequest.data.requester,
            receiver: selectedRequest.data.receiver,
            totalAmount: selectedRequest.data.totalAmount,
            ctAmount: selectedRequest.data.ctAmount,
            editedCtAmount: selectedRequest.data.editedCtAmount,
            l1ChainId: selectedRequest.data.l1ChainId,
            l2SourceChainId: selectedRequest.chainId, // The actual source chain where request was created
            l2DestinationChainId: selectedRequest.data.l2DestinationChainId,
            hashValue: selectedRequest.data.hashValue,
          }}
        />
      )}

      {/* Cancel CT Modal */}
      {selectedRequest && selectedRequest.data && (
        <CancelCTModal
          isOpen={isCancelModalOpen}
          onClose={handleCloseCancelModal}
          requestData={{
            saleCount: selectedRequest.saleCount,
            l1token: selectedRequest.data.l1token,
            l2SourceToken: selectedRequest.data.l2SourceToken,
            l2DestinationToken: selectedRequest.data.l2DestinationToken,
            requester: selectedRequest.data.requester,
            receiver: selectedRequest.data.receiver,
            totalAmount: selectedRequest.data.totalAmount,
            ctAmount: selectedRequest.data.ctAmount,
            editedCtAmount: selectedRequest.data.editedCtAmount,
            l1ChainId: selectedRequest.data.l1ChainId,
            l2SourceChainId: selectedRequest.chainId, // The actual source chain where request was created
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
          grid-template-columns: 32px 100px 200px 180px 180px 120px 120px;
          gap: 16px;
          padding: 16px 20px;
          background: rgba(26, 26, 26, 0.5);
          border-bottom: 1px solid #333333;
        }

        .expand-col {
          width: 32px;
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

        .table-row-wrapper {
          border-bottom: 1px solid rgba(51, 51, 51, 0.5);
        }

        .table-row-wrapper:last-child {
          border-bottom: none;
        }

        .table-row {
          display: grid;
          grid-template-columns: 32px 100px 200px 180px 180px 120px 120px;
          gap: 16px;
          padding: 20px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .table-row:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .expand-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4b5563;
        }

        .chevron {
          transition: transform 0.25s ease;
        }

        .chevron.rotated {
          transform: rotate(180deg);
          color: #6366f1;
        }

        .edited-badge {
          display: inline-block;
          margin-left: 8px;
          padding: 2px 6px;
          background: #f59e0b;
          color: #000;
          font-size: 9px;
          font-weight: 600;
          border-radius: 3px;
          vertical-align: middle;
        }

        .expanded-details {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.2s ease-out;
        }

        .expanded-details.show {
          grid-template-rows: 1fr;
        }

        .expanded-details-inner {
          overflow: hidden;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          padding: 20px 24px 24px 52px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(17, 17, 17, 0.6);
        }

        .detail-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .section-title {
          color: #6b7280;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 4px 0;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .detail-label {
          color: #6b7280;
          font-size: 13px;
        }

        .detail-value {
          color: #e5e7eb;
          font-size: 13px;
          font-weight: 500;
          font-family: 'SF Mono', ui-monospace, monospace;
        }

        .detail-value.muted {
          color: #6b7280;
          text-decoration: line-through;
        }

        .detail-value.profit {
          color: #10b981;
        }

        .detail-value.copyable {
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
          transition: background 0.15s;
        }

        .detail-value.copyable:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .hash-value {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .hash-value .copyable {
          color: #a78bfa;
        }

        .explorer-link {
          color: #6366f1;
          text-decoration: none;
          font-size: 14px;
        }

        .explorer-link:hover {
          color: #818cf8;
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


        .action-col {
          display: flex;
          justify-content: center;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .edit-btn,
        .cancel-btn {
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .edit-btn {
          background: #6366f1;
          color: #ffffff;
        }

        .edit-btn:hover {
          background: #5855eb;
          transform: translateY(-1px);
        }

        .cancel-btn {
          background: #ef4444;
          color: #ffffff;
        }

        .cancel-btn:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }

        .actions-section {
          grid-column: span 3;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 16px;
          margin-top: 8px;
        }

        .detail-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
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
            grid-template-columns: 32px 80px 150px 130px 130px 90px 100px;
            gap: 12px;
          }

          .details-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
            padding: 16px 20px 20px 44px;
          }

          .actions-section {
            grid-column: span 2;
          }
        }

        @media (max-width: 768px) {
          .page-title {
            font-size: 28px;
          }

          .table-header {
            display: none;
          }

          .table-row {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            padding: 16px;
          }

          .expand-indicator {
            position: absolute;
            right: 16px;
            top: 16px;
          }

          .table-row-wrapper {
            position: relative;
          }

          .table-cell {
            flex-basis: calc(50% - 6px);
          }

          .table-cell.type-col {
            order: 1;
          }

          .table-cell.token-col {
            order: 2;
          }

          .table-cell.from-col {
            order: 3;
          }

          .table-cell.to-col {
            order: 4;
          }

          .table-cell.status-col {
            order: 5;
          }

          .table-cell.action-col {
            order: 6;
            flex-basis: 100%;
            justify-content: flex-start;
          }

          .details-grid {
            grid-template-columns: 1fr;
            gap: 20px;
            padding: 16px;
          }

          .actions-section {
            grid-column: span 1;
          }

          .detail-actions {
            flex-direction: column;
          }

          .hash-value {
            flex-wrap: wrap;
            gap: 6px;
          }
        }
      `}</style>
    </div>
  )
}
