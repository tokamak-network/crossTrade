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
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Waiting'>('All')
  const [selectedToken, setSelectedToken] = useState<string>('ALL')
  const [selectedChain, setSelectedChain] = useState<string>('ALL')
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [tokenDropdownOpen, setTokenDropdownOpen] = useState(false)
  const [chainDropdownOpen, setChainDropdownOpen] = useState(false)
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
        width={18}
        height={18}
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
        width={22}
        height={22}
        style={{ borderRadius: '50%', objectFit: 'cover' }}
      />
    )
  }

  // Get all unique tokens from configs
  const getAllUniqueTokens = () => {
    const tokenSet = new Set<string>()

    Object.entries(CHAIN_CONFIG_L2_L2).forEach(([chainId, config]) => {
      if (Array.isArray(config.tokens)) {
        config.tokens.forEach(token => {
          if (token.name) tokenSet.add(token.name.toUpperCase())
        })
      } else {
        Object.keys(config.tokens).forEach(tokenSymbol => {
          tokenSet.add(tokenSymbol.toUpperCase())
        })
      }
    })

    Object.entries(CHAIN_CONFIG_L2_L1).forEach(([chainId, config]) => {
      if (Array.isArray(config.tokens)) {
        config.tokens.forEach(token => {
          if (token.name) tokenSet.add(token.name.toUpperCase())
        })
      } else {
        Object.keys(config.tokens).forEach(tokenSymbol => {
          tokenSet.add(tokenSymbol.toUpperCase())
        })
      }
    })

    return Array.from(tokenSet).map(symbol => ({
      symbol,
      logo: getTokenLogo(symbol)
    }))
  }

  // Get all unique chains
  const getAllUniqueChains = () => {
    const chainMap: { [key: string]: { id: number; name: string; logo: string } } = {}

    // Add L1 (Ethereum Sepolia)
    const l1Config = CHAIN_CONFIG_L2_L2['11155111'] || CHAIN_CONFIG_L2_L1['11155111']
    if (l1Config) {
      chainMap['11155111'] = {
        id: 11155111,
        name: l1Config.display_name,
        logo: getChainLogo(l1Config.display_name)
      }
    }

    // Add all L2 chains
    l2Chains.forEach(({ chainId, config }) => {
      if (!chainMap[chainId.toString()]) {
        chainMap[chainId.toString()] = {
          id: chainId,
          name: config.display_name,
          logo: getChainLogo(config.display_name)
        }
      }
    })

    return Object.values(chainMap)
  }

  const allTokens = getAllUniqueTokens()
  const allChains = getAllUniqueChains()

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

  const filteredRequests = historyRequests
    .filter(req => {
      if (!req.data) return false
      const typeMatch = activeFilter === 'All' || req.type === activeFilter
      const statusMatch = statusFilter === 'All' || req.status === statusFilter
      const tokenSymbol = getTokenSymbol(req.data.l2SourceToken)
      const tokenMatch = selectedToken === 'ALL' || tokenSymbol === selectedToken

      // Chain filter - check both source and destination chains
      const fromChain = req.type === 'Provide' ? getChainName(BigInt(11155111)) : req.chainName
      const toChain = getChainName(req.data.l2DestinationChainId)
      const chainMatch = selectedChain === 'ALL' || fromChain === selectedChain || toChain === selectedChain

      return typeMatch && statusMatch && tokenMatch && chainMatch
    })
    .sort((a, b) => {
      // Sort: Waiting first, then Completed, then Cancelled
      const statusOrder = { 'Waiting': 0, 'Completed': 1, 'Cancelled': 2 }
      return statusOrder[a.status] - statusOrder[b.status]
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
        </div>

        <div className="filter-row">
          {/* Type Dropdown */}
          <div className="dropdown-wrapper">
            <div className="dropdown-label">Type</div>
            <div
              className={`dropdown-trigger ${typeDropdownOpen ? 'open' : ''}`}
              onClick={() => {
                setTypeDropdownOpen(!typeDropdownOpen)
                setStatusDropdownOpen(false)
                setTokenDropdownOpen(false)
                setChainDropdownOpen(false)
              }}
            >
              <div className="dropdown-value">
                <span>{activeFilter === 'All' ? 'All Types' : activeFilter}</span>
              </div>
              <svg className="dropdown-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            {typeDropdownOpen && (
              <>
                <div className="dropdown-backdrop" onClick={() => setTypeDropdownOpen(false)} />
                <div className="dropdown-menu">
                  {(['All', 'Request', 'Provide'] as const).map((type) => (
                    <div
                      key={type}
                      className={`dropdown-item ${activeFilter === type ? 'selected' : ''}`}
                      onClick={() => { setActiveFilter(type); setTypeDropdownOpen(false) }}
                    >
                      <span>{type === 'All' ? 'All Types' : type}</span>
                      {activeFilter === type && <span className="check-mark">✓</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Token Dropdown */}
          <div className="dropdown-wrapper">
            <div className="dropdown-label">Token</div>
            <div
              className={`dropdown-trigger ${tokenDropdownOpen ? 'open' : ''}`}
              onClick={() => {
                setTokenDropdownOpen(!tokenDropdownOpen)
                setTypeDropdownOpen(false)
                setStatusDropdownOpen(false)
                setChainDropdownOpen(false)
              }}
            >
              <div className="dropdown-value">
                {selectedToken !== 'ALL' && (
                  <Image
                    src={getTokenLogo(selectedToken)}
                    alt=""
                    width={24}
                    height={24}
                    className="dropdown-icon"
                  />
                )}
                <span>{selectedToken === 'ALL' ? 'All Tokens' : selectedToken}</span>
              </div>
              <svg className="dropdown-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            {tokenDropdownOpen && (
              <>
                <div className="dropdown-backdrop" onClick={() => setTokenDropdownOpen(false)} />
                <div className="dropdown-menu">
                  <div
                    className={`dropdown-item ${selectedToken === 'ALL' ? 'selected' : ''}`}
                    onClick={() => { setSelectedToken('ALL'); setTokenDropdownOpen(false) }}
                  >
                    <span>All Tokens</span>
                    {selectedToken === 'ALL' && <span className="check-mark">✓</span>}
                  </div>
                  {allTokens.map((token) => (
                    <div
                      key={token.symbol}
                      className={`dropdown-item ${selectedToken === token.symbol ? 'selected' : ''}`}
                      onClick={() => { setSelectedToken(token.symbol); setTokenDropdownOpen(false) }}
                    >
                      <Image src={token.logo} alt="" width={22} height={22} className="dropdown-item-icon" />
                      <span>{token.symbol}</span>
                      {selectedToken === token.symbol && <span className="check-mark">✓</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Chain Dropdown */}
          <div className="dropdown-wrapper">
            <div className="dropdown-label">Chain</div>
            <div
              className={`dropdown-trigger ${chainDropdownOpen ? 'open' : ''}`}
              onClick={() => {
                setChainDropdownOpen(!chainDropdownOpen)
                setTypeDropdownOpen(false)
                setStatusDropdownOpen(false)
                setTokenDropdownOpen(false)
              }}
            >
              <div className="dropdown-value">
                {selectedChain !== 'ALL' && (
                  <Image
                    src={allChains.find(c => c.name === selectedChain)?.logo || getChainLogo(selectedChain)}
                    alt=""
                    width={24}
                    height={24}
                    className="dropdown-icon"
                  />
                )}
                <span>{selectedChain === 'ALL' ? 'All Chains' : selectedChain}</span>
              </div>
              <svg className="dropdown-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            {chainDropdownOpen && (
              <>
                <div className="dropdown-backdrop" onClick={() => setChainDropdownOpen(false)} />
                <div className="dropdown-menu">
                  <div
                    className={`dropdown-item ${selectedChain === 'ALL' ? 'selected' : ''}`}
                    onClick={() => { setSelectedChain('ALL'); setChainDropdownOpen(false) }}
                  >
                    <span>All Chains</span>
                    {selectedChain === 'ALL' && <span className="check-mark">✓</span>}
                  </div>
                  {allChains.map((chain) => (
                    <div
                      key={chain.id}
                      className={`dropdown-item ${selectedChain === chain.name ? 'selected' : ''}`}
                      onClick={() => { setSelectedChain(chain.name); setChainDropdownOpen(false) }}
                    >
                      <Image src={chain.logo} alt="" width={22} height={22} className="dropdown-item-icon" />
                      <span>{chain.name}</span>
                      {selectedChain === chain.name && <span className="check-mark">✓</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="dropdown-wrapper">
            <div className="dropdown-label">Status</div>
            <div
              className={`dropdown-trigger ${statusDropdownOpen ? 'open' : ''}`}
              onClick={() => {
                setStatusDropdownOpen(!statusDropdownOpen)
                setTypeDropdownOpen(false)
                setTokenDropdownOpen(false)
                setChainDropdownOpen(false)
              }}
            >
              <div className="dropdown-value">
                <span>{statusFilter === 'All' ? 'All Status' : statusFilter}</span>
              </div>
              <svg className="dropdown-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            {statusDropdownOpen && (
              <>
                <div className="dropdown-backdrop" onClick={() => setStatusDropdownOpen(false)} />
                <div className="dropdown-menu">
                  {(['All', 'Waiting', 'Completed'] as const).map((status) => (
                    <div
                      key={status}
                      className={`dropdown-item ${statusFilter === status ? 'selected' : ''}`}
                      onClick={() => { setStatusFilter(status); setStatusDropdownOpen(false) }}
                    >
                      <span>{status === 'All' ? 'All Status' : status}</span>
                      {statusFilter === status && <span className="check-mark">✓</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
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
          <div className="history-container">
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
                <div key={rowKey} className={`history-row ${isExpanded ? 'expanded' : ''}`}>
                  {/* Main Row */}
                  <div className="row-main" onClick={() => toggleRowExpanded(rowKey)}>
                    {/* Type */}
                    <div className={`type-badge ${request.type.toLowerCase()}`}>
                      {request.type === 'Request' ? 'REQ' : 'PRV'}
                    </div>

                    {/* Amount */}
                    <div className="amount-cell">
                      <span className="amount-number">{amount}</span>
                      <span className="amount-symbol">{tokenSymbol}</span>
                      {hasEdited && <span className="edited-tag">EDITED</span>}
                    </div>

                    {/* Route */}
                    <div className="route-cell">
                      <div className="chain-badge">
                        <div className="chain-icon">{renderChainIcon(fromChain)}</div>
                        <span>{fromChain}</span>
                      </div>
                      <svg className="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div className="chain-badge">
                        <div className="chain-icon">{renderChainIcon(toChain)}</div>
                        <span>{toChain}</span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className={`status-text ${request.status.toLowerCase()}`}>
                      {request.status}
                    </div>

                    {/* Actions */}
                    <div className="actions-cell">
                      {request.status === 'Waiting' && request.type === 'Request' ? (
                        <div className="action-group">
                          <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleEdit(request) }}>Edit</button>
                          <span className="divider"></span>
                          <button className="action-btn danger" onClick={(e) => { e.stopPropagation(); handleCancel(request) }}>Cancel</button>
                        </div>
                      ) : (
                        <button className="action-btn" onClick={(e) => { e.stopPropagation(); toggleRowExpanded(rowKey) }}>
                          {isExpanded ? 'Hide' : 'Details'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="row-details">
                      <div className="detail-card">
                        <div className="detail-header">Amounts</div>
                        <div className="detail-item">
                          <span className="detail-label">Total Amount</span>
                          <span className="detail-value">{totalAmount} {tokenSymbol}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Bridge Amount</span>
                          <span className="detail-value">{amount} {tokenSymbol}</span>
                        </div>
                        {hasEdited && (
                          <div className="detail-item muted">
                            <span className="detail-label">Original</span>
                            <span className="detail-value">{originalAmount} {tokenSymbol}</span>
                          </div>
                        )}
                        {request.status !== 'Cancelled' && (
                          <div className="detail-item highlight">
                            <span className="detail-label">Reward</span>
                            <span className="detail-value">+{rewardAmount} {tokenSymbol}</span>
                          </div>
                        )}
                      </div>
                      <div className="detail-card">
                        <div className="detail-header">Addresses</div>
                        {renderAddress('Requester', data.requester, rowKey)}
                        {renderAddress('Receiver', data.receiver, rowKey)}
                        {data.provider !== '0x0000000000000000000000000000000000000000' && renderAddress('Provider', data.provider, rowKey)}
                      </div>
                      <div className="detail-card">
                        <div className="detail-header">Info</div>
                        <div className="detail-item">
                          <span className="detail-label">Request ID</span>
                          <span className="detail-value">#{request.saleCount}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Type</span>
                          <span className="detail-value">{request.type}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
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
          background: #0a0a0a;
        }

        main {
          max-width: 1000px;
          margin: 0 auto;
          padding: 100px 20px 60px;
        }

        .header {
          margin-bottom: 24px;
        }

        h1 {
          font-size: 32px;
          font-weight: 600;
          color: #ffffff;
          margin: 0;
        }

        /* Filter Row - matches RequestPool */
        .filter-row {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .dropdown-wrapper {
          flex: 1;
          position: relative;
        }

        .dropdown-label {
          color: #6b7280;
          font-size: 13px;
          font-weight: 400;
          margin-bottom: 8px;
        }

        .dropdown-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #1f1f23;
          border-radius: 16px;
          padding: 14px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dropdown-trigger:hover {
          background: #27272a;
        }

        .dropdown-trigger.open {
          background: #27272a;
        }

        .dropdown-value {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .dropdown-value span {
          color: #ffffff;
          font-size: 16px;
          font-weight: 600;
        }

        .dropdown-chevron {
          color: #6b7280;
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .dropdown-trigger.open .dropdown-chevron {
          transform: rotate(180deg);
        }

        .dropdown-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 99;
        }

        .dropdown-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: #1f1f23;
          border-radius: 16px;
          padding: 8px;
          z-index: 100;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          max-height: 280px;
          overflow-y: auto;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .dropdown-item.selected {
          background: rgba(99, 102, 241, 0.12);
        }

        .dropdown-item span {
          color: #ffffff;
          font-size: 15px;
          font-weight: 500;
          flex: 1;
        }

        .check-mark {
          color: #818cf8;
          font-size: 16px;
        }

        .dropdown-icon,
        .dropdown-item-icon {
          border-radius: 50%;
          flex-shrink: 0;
        }

        .empty {
          text-align: center;
          color: #6b7280;
          padding: 60px 20px;
          font-size: 14px;
          margin: 0;
        }

        .empty.error { color: #ef4444; }

        /* History Container - matches RequestPool cards-container */
        .history-container {
          background: linear-gradient(145deg, #161618 0%, #111113 100%);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
        }

        /* Row - matches request-card */
        .history-row {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          transition: background 0.15s ease;
        }

        .history-row:last-child {
          border-bottom: none;
        }

        .history-row:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .history-row.expanded {
          background: rgba(255, 255, 255, 0.03);
        }

        /* Main Row Grid */
        .row-main {
          display: grid;
          grid-template-columns: 56px 140px 1fr 90px 110px;
          align-items: center;
          gap: 20px;
          padding: 16px 24px;
          cursor: pointer;
        }

        /* Type Badge */
        .type-badge {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          padding: 6px 0;
          border-radius: 6px;
          text-transform: uppercase;
          text-align: center;
          width: 100%;
        }

        .type-badge.request {
          color: #c4b5fd;
          background: rgba(139, 92, 246, 0.15);
        }

        .type-badge.provide {
          color: #60a5fa;
          background: rgba(59, 130, 246, 0.12);
        }

        /* Amount Cell */
        .amount-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .amount-number {
          font-family: 'JetBrains Mono', monospace;
          font-size: 16px;
          font-weight: 600;
          color: #fff;
        }

        .amount-symbol {
          font-size: 13px;
          font-weight: 500;
          color: #71717a;
        }

        .edited-tag {
          font-size: 9px;
          font-weight: 600;
          color: #fbbf24;
          background: rgba(251, 191, 36, 0.12);
          padding: 2px 5px;
          border-radius: 3px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        /* Route Cell */
        .route-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .chain-badge {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .chain-badge span {
          font-size: 13px;
          font-weight: 400;
          color: #a1a1aa;
          white-space: nowrap;
        }

        .chain-icon {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .arrow-icon {
          color: #52525b;
          flex-shrink: 0;
        }

        /* Status Text */
        .status-text {
          font-size: 13px;
          font-weight: 500;
          text-align: left;
        }

        .status-text.completed {
          color: #4ade80;
        }

        .status-text.waiting {
          color: #fbbf24;
        }

        .status-text.cancelled {
          color: #71717a;
        }

        /* Actions Cell */
        .actions-cell {
          display: flex;
          justify-content: flex-start;
        }

        /* Action Group */
        .action-group {
          display: flex;
          align-items: center;
        }

        .action-group .divider {
          width: 1px;
          height: 12px;
          background: #52525b;
        }

        /* Action Buttons */
        .action-btn {
          background: transparent;
          border: none;
          padding: 0;
          font-size: 13px;
          font-weight: 500;
          color: #a1a1aa;
          cursor: pointer;
          transition: color 0.15s;
        }

        .action-btn:hover {
          color: #fff;
        }

        .action-btn.danger {
          color: #f87171;
        }

        .action-btn.danger:hover {
          color: #fca5a5;
        }

        /* Expanded Details */
        .row-details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          padding: 20px 24px;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .detail-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-header {
          font-size: 11px;
          font-weight: 500;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .detail-item:last-child {
          border-bottom: none;
        }

        .detail-label {
          font-size: 13px;
          color: #71717a;
        }

        .detail-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: #ffffff;
        }

        .detail-item.muted .detail-value {
          color: #52525b;
          text-decoration: line-through;
        }

        .detail-item.highlight .detail-value {
          color: #4ade80;
        }

        /* Legacy detail-row for addresses */
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          font-size: 13px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .row-main {
            grid-template-columns: 50px 120px 1fr 80px 110px;
            gap: 16px;
            padding: 14px 16px;
          }
          .chain-badge span { font-size: 12px; }
          .row-details { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
          .row-main {
            grid-template-columns: 50px 1fr 75px 100px;
            gap: 12px;
            padding: 14px 16px;
          }
          .route-cell { display: none; }
          .row-details { grid-template-columns: 1fr 1fr; gap: 16px; }
        }

        @media (max-width: 600px) {
          main { padding: 90px 16px 40px; }
          .filter-row { flex-wrap: wrap; }
          .dropdown-wrapper { flex: 1 1 45%; }
          .row-main {
            grid-template-columns: 50px 1fr 70px 90px;
            gap: 10px;
            padding: 12px;
          }
          .amount-number { font-size: 14px; }
          .amount-symbol { font-size: 11px; }
          .action-btn { font-size: 12px; }
          .row-details { grid-template-columns: 1fr; }
        }

        @media (max-width: 480px) {
          .filter-row { flex-direction: column; }
          .dropdown-wrapper { flex: 1 1 100%; }
          .row-main {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            padding: 14px;
          }
          .type-badge { grid-column: 1; }
          .amount-cell { grid-column: 2; justify-self: end; }
          .status-text { grid-column: 1; }
          .actions-cell { grid-column: 2; }
        }
      `}</style>
    </div>
  )
}
