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
  L2_L1_EDIT_FEE_ABI,
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
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set())

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

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)

  const handleAddressClick = (e: React.MouseEvent, key: string, address: string) => {
    e.stopPropagation()
    copyToClipboard(address)
    setExpandedAddresses(prev => new Set(prev).add(key))
    // Auto-clear "Copied" after 1.5s
    setTimeout(() => {
      setExpandedAddresses(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }, 1500)
  }

  const renderAddress = (label: string, address: string, rowKey: string) => {
    const key = `${rowKey}-${label}`
    const isCopied = expandedAddresses.has(key)
    return (
      <div className="detail-row" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 0',
        fontSize: '13px',
        borderBottom: '1px solid #27272a',
      }}>
        <span style={{
          color: '#a1a1aa',
          flexShrink: 0,
          minWidth: '70px',
        }}>{label}</span>
        <span
          onClick={(e) => handleAddressClick(e, key, address)}
          title="Click to copy"
          style={{
            color: isCopied ? '#4ade80' : '#ffffff',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          {isCopied ? 'Copied!' : truncateAddress(address)}
        </span>
      </div>
    )
  }

  return (
    <div className="page">
      <Navigation />

      <main>
        <div className="header">
          <h1>History</h1>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['All', 'Provide', 'Request'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{
                  background: activeFilter === f ? '#27272a' : 'transparent',
                  border: 'none',
                  color: activeFilter === f ? '#fff' : '#52525b',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '8px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  margin: 0,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {!userAddress ? (
          <p className="empty">Connect your wallet to view history</p>
        ) : loading ? (
          <p className="empty">Loading...</p>
        ) : error ? (
          <p className="empty error">{error}</p>
        ) : filteredRequests.length === 0 ? (
          <p className="empty">No transactions yet</p>
        ) : (
          <>
            {filteredRequests.map((request, index) => {
              const data = request.data!
              const rowKey = `${request.chainId}-${request.saleCount}-${index}`
              const isExpanded = expandedRows.has(rowKey)
              const tokenSymbol = getTokenSymbol(data.l2SourceToken)
              const actualCtAmount = data.editedCtAmount || data.ctAmount
              const amount = formatTokenAmount(actualCtAmount, data.l2SourceToken)
              const originalAmount = formatTokenAmount(data.ctAmount, data.l2SourceToken)
              const totalAmount = formatTokenAmount(data.totalAmount, data.l2SourceToken)
              const hasEdited = data.editedCtAmount !== undefined && data.editedCtAmount !== data.ctAmount
              const fromChain = request.type === 'Provide' ? getChainName(BigInt(11155111)) : request.chainName
              const toChain = getChainName(data.l2DestinationChainId)
              const reward = data.totalAmount - actualCtAmount
              const rewardAmount = formatTokenAmount(reward, data.l2SourceToken)

              return (
                <div key={rowKey} className={`row ${isExpanded ? 'open' : ''}`} onClick={() => toggleRowExpanded(rowKey)}>
                  <div className="row-main">
                    <span className={`badge ${request.type.toLowerCase()}`}>{request.type}</span>

                    <div className="token">
                      {renderTokenIcon(tokenSymbol)}
                      <strong>{amount}</strong>
                      <span>{tokenSymbol}</span>
                      {hasEdited && <em>EDITED</em>}
                    </div>

                    <div className="route">
                      <div className="chain-from">
                        {renderChainIcon(fromChain)}
                        <span>{fromChain}</span>
                      </div>
                      <span className="arrow">→</span>
                      <div className="chain-to">
                        {renderChainIcon(toChain)}
                        <span>{toChain}</span>
                      </div>
                    </div>

                    <span className={`status ${request.status.toLowerCase()}`}>{request.status}</span>

                    <div className="actions">
                      {request.status === 'Waiting' && request.type === 'Request' && (
                        <>
                          <button className="btn-edit" onClick={(e) => { e.stopPropagation(); handleEdit(request) }}>Edit</button>
                          <button className="btn-cancel" onClick={(e) => { e.stopPropagation(); handleCancel(request) }}>Cancel</button>
                        </>
                      )}
                      <svg className={`chevron ${isExpanded ? 'flip' : ''}`} viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="details">
                      <div className="detail-section">
                        <h5>Amounts</h5>
                        <div className="detail-row"><span>Total</span><span>{totalAmount} {tokenSymbol}</span></div>
                        <div className="detail-row"><span>Bridge</span><span>{amount} {tokenSymbol}</span></div>
                        {hasEdited && <div className="detail-row muted"><span>Original</span><span>{originalAmount} {tokenSymbol}</span></div>}
                        {request.status !== 'Cancelled' && <div className="detail-row green"><span>Reward</span><span>+{rewardAmount} {tokenSymbol}</span></div>}
                      </div>
                      <div className="detail-section">
                        <h5>Addresses</h5>
                        {renderAddress('Requester', data.requester, rowKey)}
                        {renderAddress('Receiver', data.receiver, rowKey)}
                        {data.provider !== '0x0000000000000000000000000000000000000000' && renderAddress('Provider', data.provider, rowKey)}
                      </div>
                      <div className="detail-section">
                        <h5>Transaction</h5>
                        <div className="detail-row">
                          <span>ID</span>
                          <span>#{request.saleCount}</span>
                        </div>
                        <div className="detail-row">
                          <span>Route</span>
                          <span>{fromChain} → {toChain}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </main>

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
        .page {
          min-height: 100vh;
          background: #09090b;
        }

        main {
          max-width: 960px;
          margin: 0 auto;
          padding: 110px 24px 60px;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
        }

        h1 {
          font-size: 22px;
          font-weight: 600;
          color: #fafafa;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .tabs {
          display: flex;
          gap: 2px;
          background: #18181b;
          padding: 3px;
          border-radius: 8px;
          border: 1px solid #27272a;
        }

        .tabs :global(button) {
          background: transparent;
          border: none;
          color: #71717a;
          font-size: 13px;
          font-weight: 500;
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .tabs :global(button:hover) {
          color: #a1a1aa;
          background: rgba(255,255,255,0.03);
        }

        .tabs :global(button.active) {
          background: #27272a;
          color: #fff;
          box-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }

        .empty {
          text-align: center;
          color: #52525b;
          padding: 80px 20px;
          font-size: 15px;
          margin: 0;
        }

        .empty.error { color: #ef4444; }

        .row {
          background: #18181b;
          border-radius: 16px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .row:hover { background: #1f1f23; }
        .row.open { background: #1f1f23; }

        .row-main {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 20px;
        }

        .badge {
          font-size: 11px;
          font-weight: 700;
          padding: 5px 10px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .badge.provide { background: #1d4ed8; color: #93c5fd; }
        .badge.request { background: #6d28d9; color: #c4b5fd; }

        .token {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 160px;
        }

        .token strong {
          font-family: 'JetBrains Mono', monospace;
          font-size: 16px;
          color: #fff;
        }

        .token span { color: #71717a; font-size: 14px; }

        .token em {
          font-style: normal;
          font-size: 9px;
          font-weight: 700;
          color: #fbbf24;
          background: rgba(251, 191, 36, 0.2);
          padding: 2px 5px;
          border-radius: 4px;
          margin-left: 4px;
        }

        .route {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex: 1;
          color: #a1a1aa;
          font-size: 14px;
        }

        .chain-from, .chain-to {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .route .arrow {
          color: #52525b;
          font-size: 16px;
        }

        .status {
          font-size: 13px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 20px;
        }

        .status.completed { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
        .status.waiting { background: rgba(234, 179, 8, 0.15); color: #facc15; }
        .status.cancelled { background: rgba(239, 68, 68, 0.15); color: #f87171; }

        .actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }

        .btn-edit, .btn-cancel {
          font-size: 12px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-edit { background: #6366f1; color: #fff; }
        .btn-edit:hover { background: #4f46e5; }

        .btn-cancel { background: #27272a; color: #a1a1aa; }
        .btn-cancel:hover { background: #ef4444; color: #fff; }

        .chevron {
          width: 16px;
          height: 16px;
          color: #52525b;
          transition: transform 0.2s;
        }

        .chevron.flip { transform: rotate(180deg); color: #6366f1; }

        .details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          padding: 20px;
          border-top: 1px solid #27272a;
          background: #18181b;
          overflow: visible;
        }

        .detail-section {
          overflow: visible;
        }

        .detail-section h5 {
          font-size: 11px;
          font-weight: 600;
          color: #d4d4d8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 12px 0;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 8px 0;
          font-size: 13px;
          border-bottom: 1px solid #27272a;
          overflow: visible;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-row > span:first-child {
          color: #a1a1aa;
          flex-shrink: 0;
          min-width: 70px;
        }

        .detail-row > span:last-child {
          color: #ffffff;
          font-family: 'JetBrains Mono', monospace;
          text-align: right;
          overflow: visible;
          word-break: break-all;
        }

        .detail-row.muted span:last-child {
          color: #71717a;
          text-decoration: line-through;
        }

        .detail-row.green span:last-child {
          color: #4ade80;
        }

        .addr-copy {
          color: #ffffff;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          transition: color 0.15s;
        }

        .addr-copy:hover {
          color: #a78bfa;
        }

        .copied-badge {
          font-size: 11px;
          font-weight: 600;
          color: #4ade80;
          background: rgba(74, 222, 128, 0.15);
          padding: 2px 8px;
          border-radius: 4px;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8); }
          50% { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }

        @media (max-width: 900px) {
          .details {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 800px) {
          .route { display: none; }
          .token { min-width: auto; flex: 1; }
        }

        @media (max-width: 600px) {
          main { padding: 100px 16px 40px; }
          .header { flex-direction: column; gap: 16px; align-items: flex-start; }
          .row-main { flex-wrap: wrap; gap: 12px; padding: 14px 16px; }
          .badge { order: 0; }
          .token { order: 1; width: 100%; }
          .status { order: 2; }
          .actions { order: 3; width: 100%; justify-content: space-between; }
          .details {
            grid-template-columns: 1fr;
            gap: 20px;
            padding: 16px;
          }
        }
      `}</style>
    </div>
  )
}
