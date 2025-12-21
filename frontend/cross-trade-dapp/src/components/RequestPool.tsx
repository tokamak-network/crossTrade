'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { usePublicClient, useAccount } from 'wagmi'
import { createPublicClient, http, defineChain } from 'viem'
import { CHAIN_CONFIG_L2_L2, CHAIN_CONFIG_L2_L1, getTokenDecimals, getChainsFor_L2_L2, getChainsFor_L2_L1 } from '@/config/contracts'
import { Navigation } from './Navigation'
import { ReviewProvideModal } from './ReviewProvideModal'
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

interface Request {
  saleCount: number
  chainId: number
  chainName: string
  contractAddress: string
  contractType: 'L2_L2' | 'L2_L1' // Track the type of cross-trade
  data: RequestData | null
}

const FULFILLED_KEY = 'fulfilledSaleCounts_v2'

export const RequestPool = () => {
  const publicClient = usePublicClient()
  const { address: connectedAddress } = useAccount()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fulfilledSaleCounts, setFulfilledSaleCounts] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(FULFILLED_KEY)
      if (saved) return new Set(JSON.parse(saved))
    }
    return new Set()
  })
  const [forceRefresh, setForceRefresh] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [isProvideModalOpen, setIsProvideModalOpen] = useState(false)
  const [selectedToken, setSelectedToken] = useState<string>('ALL')
  const [selectedChain, setSelectedChain] = useState<string>('ALL')

  // Get all L2 chains that have l2_cross_trade contracts (both L2_L2 and L2_L1)
  const getL2Chains = () => {
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
    
    return [...l2l2Chains, ...l2l1Chains]
  }

  const l2Chains = getL2Chains()

  // Generate logo path for tokens and chains instead of random emojis
  const getTokenLogoPath = (tokenSymbol: string): string => {
    return getTokenLogo(tokenSymbol)
  }

  const getChainLogoPath = (chainName: string): string => {
    return getChainLogo(chainName)
  }

  // Get all unique tokens from all chain configs
  const getAllUniqueTokens = () => {
    const tokenSet = new Set<string>()
    const tokenMap: { [key: string]: { symbol: string; emoji: string; addresses: string[] } } = {}
    
    // Collect from L2_L2 config
    Object.entries(CHAIN_CONFIG_L2_L2).forEach(([chainId, config]) => {
      // Handle both NEW array format and OLD object format
      if (Array.isArray(config.tokens)) {
        // NEW format: array of TokenWithDestinations
        config.tokens.forEach(token => {
          const tokenSymbol = token.name.toUpperCase()
          const address = token.address
          
          if (address && address !== '') {
            if (!tokenMap[tokenSymbol]) {
              tokenMap[tokenSymbol] = {
                symbol: tokenSymbol,
                logo: getTokenLogoPath(tokenSymbol),
                addresses: []
              }
            }
            if (!tokenMap[tokenSymbol].addresses.includes(address.toLowerCase())) {
              tokenMap[tokenSymbol].addresses.push(address.toLowerCase())
            }
          }
        })
      } else {
        // OLD format: object with key-value pairs
        Object.entries(config.tokens).forEach(([tokenSymbol, address]) => {
          if (address && address !== '') {
            // tokenSymbol is already normalized to uppercase at load time
            if (!tokenMap[tokenSymbol]) {
              tokenMap[tokenSymbol] = {
                symbol: tokenSymbol,
                logo: getTokenLogoPath(tokenSymbol),
                addresses: []
              }
            }
            if (!tokenMap[tokenSymbol].addresses.includes(address.toLowerCase())) {
              tokenMap[tokenSymbol].addresses.push(address.toLowerCase())
            }
          }
        })
      }
    })
    
    // Collect from L2_L1 config
    Object.entries(CHAIN_CONFIG_L2_L1).forEach(([chainId, config]) => {
      // Handle both NEW array format and OLD object format
      if (Array.isArray(config.tokens)) {
        // NEW format: array of TokenWithDestinations
        config.tokens.forEach(token => {
          const tokenSymbol = token.name.toUpperCase()
          const address = token.address
          
          if (address && address !== '') {
            if (!tokenMap[tokenSymbol]) {
              tokenMap[tokenSymbol] = {
                symbol: tokenSymbol,
                logo: getTokenLogoPath(tokenSymbol),
                addresses: []
              }
            }
            if (!tokenMap[tokenSymbol].addresses.includes(address.toLowerCase())) {
              tokenMap[tokenSymbol].addresses.push(address.toLowerCase())
            }
          }
        })
      } else {
        // OLD format: object with key-value pairs
        Object.entries(config.tokens).forEach(([tokenSymbol, address]) => {
          if (address && address !== '') {
            // tokenSymbol is already normalized to uppercase at load time
            if (!tokenMap[tokenSymbol]) {
              tokenMap[tokenSymbol] = {
                symbol: tokenSymbol,
                logo: getTokenLogoPath(tokenSymbol),
                addresses: []
              }
            }
            if (!tokenMap[tokenSymbol].addresses.includes(address.toLowerCase())) {
              tokenMap[tokenSymbol].addresses.push(address.toLowerCase())
            }
          }
        })
      }
    })
    
    return Object.values(tokenMap)
  }

  // Get all unique chains with emojis (includes L1 for L2_L1 rewards)
  const getAllUniqueChains = () => {
    const chainMap: { [key: string]: { id: number; name: string; emoji: string } } = {}
    
    // Add all L2 chains
    l2Chains.forEach(({ chainId, config }) => {
      if (!chainMap[chainId.toString()]) {
        chainMap[chainId.toString()] = {
          id: chainId,
          name: config.display_name,
          logo: getChainLogoPath(config.display_name)
        }
      }
    })
    
    // Add L1 (Ethereum) for L2_L1 rewards
    // Check both L2_L2 and L2_L1 configs for Ethereum Sepolia (11155111)
    const l1ChainId = 11155111
    const l1Config = CHAIN_CONFIG_L2_L2[l1ChainId.toString()] || CHAIN_CONFIG_L2_L1[l1ChainId.toString()]
    if (l1Config) {
      chainMap[l1ChainId.toString()] = {
        id: l1ChainId,
        name: l1Config.display_name,
        logo: getChainLogoPath(l1Config.display_name)
      }
    }
    
    return Object.values(chainMap)
  }

  const allTokens = getAllUniqueTokens()
  const allChains = getAllUniqueChains()

  // Helper function to format token amounts with proper decimals
  const formatTokenAmount = (amount: bigint, tokenAddress: string) => {
    // Determine token symbol and decimals based on address
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
            symbol = tokenSymbol // Already normalized to uppercase at load time
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
              symbol = tokenSymbol // Already normalized to uppercase at load time
              decimals = getTokenDecimals(tokenSymbol)
            }
          })
        }
      })
    }
    
    // Debug: Log unknown tokens
    if (symbol === 'UNKNOWN') {
      console.warn('⚠️ [formatTokenAmount] Unknown token address:', tokenAddress)
    }

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
    const chainIdStr = chainIdNum.toString()
    // Try L2_L2 config first, then L2_L1
    const config = CHAIN_CONFIG_L2_L2[chainIdStr] || CHAIN_CONFIG_L2_L1[chainIdStr]
    return config?.display_name || `Chain ${chainId}`
  }

  // Helper function to render chain logo (uses dynamic mapping)
  const renderChainLogo = (chainName: string) => {
    const chain = allChains.find(c => c.name === chainName)
    const logoSrc = chain?.logo || getChainLogo(chainName)
    return <Image src={logoSrc} alt={chainName} width={20} height={20} style={{ borderRadius: '50%', marginRight: '6px' }} />
  }

  // Helper function to render token logo (uses dynamic mapping)
  const renderTokenLogo = (tokenAddress: string) => {
    const normalizedAddress = tokenAddress.toLowerCase()
    const token = allTokens.find(t => t.addresses.includes(normalizedAddress))
    const logoSrc = token?.logo || getTokenLogo('ERC20')
    const tokenSymbol = token?.symbol || 'TOKEN'
    return <Image src={logoSrc} alt={tokenSymbol} width={20} height={20} style={{ borderRadius: '50%', marginRight: '6px' }} />
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

  const fetchAllRequests = async (fullRefresh = false) => {
    if (!publicClient) return

    setLoading(true)
    setError(null)

    try {
      const allRequestsArray: Request[] = []
      let newFulfilled = new Set<string>(fullRefresh ? [] : Array.from(fulfilledSaleCounts))

        console.log('🚀 [RequestPool] Starting fetch, l2Chains:', l2Chains)

        // Get all possible destination chain IDs (all L2 chains + L1)
        const allDestinationChainIds = [
          ...l2Chains.map(chain => chain.chainId),
          11155111 // Ethereum Sepolia (L1)
        ]

        // Fetch requests from all L2 chains
        for (const { chainId: sourceChainId, config, type: contractType } of l2Chains) {
          console.log(`🔄 [RequestPool] Processing chain ${sourceChainId} (${config.display_name}) - Type: ${contractType}`)
          const contractAddress = config.contracts.l2_cross_trade
          if (!contractAddress || contractAddress === '') {
            console.log(`⚠️ [RequestPool] No contract address for chain ${sourceChainId}, skipping`)
            continue
          }

          try {
            if (contractType === 'L2_L2') {
              // L2_L2 contract: has separate saleCountChainId per destination
              console.log(`📍 [${config.display_name}] Checking destinations:`, allDestinationChainIds)
              
              // Create a chain-specific client for this L2 source chain
              const l2Client = getPublicClientForChain(sourceChainId)
              
              for (const destinationChainId of allDestinationChainIds) {
                try {
                  // Get the current saleCount for requests going to this destination
                  console.log(`🔍 [${config.display_name} -> ${destinationChainId}] Calling saleCountChainId...`)
                  
                  const currentSaleCount = await l2Client.readContract({
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
                  console.log(`📊 [${config.display_name} -> ${destinationChainId}] Found ${totalRequests} requests`)

                  // Fetch individual requests for this source->destination pair
                  for (let saleCount = 1; saleCount <= totalRequests; saleCount++) {
                    const requestKey = `${contractAddress}_${destinationChainId}_${saleCount}`
                    if (!fullRefresh && fulfilledSaleCounts.has(requestKey)) continue // skip known fulfilled
                    
                    try {
                      const data = await l2Client.readContract({
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
                        newFulfilled.add(requestKey)
                        continue // skip fulfilled
                      }

                      // Check for edited ctAmount on L1
                      const editedCtAmount = await getEditedCtAmount(requestData.hashValue, 'L2_L2')
                      if (editedCtAmount) {
                        console.log(`📝 Found edited ctAmount for hash ${requestData.hashValue}: ${editedCtAmount.toString()}`)
                        requestData.editedCtAmount = editedCtAmount
                      }

                      // Add request if it has a valid totalAmount (includes native token transfers where l1token is 0x0000...)
                      if (requestData.totalAmount > BigInt(0)) {
                        allRequestsArray.push({ 
                          saleCount, 
                          chainId: sourceChainId, 
                          chainName: config.display_name,
                          contractAddress: contractAddress,
                          contractType: 'L2_L2',
                          data: requestData 
                        })
                      }
                    } catch (err) {
                      console.error(`Error fetching L2_L2 request ${saleCount} from ${config.display_name} to ${destinationChainId}:`, err)
                    }
                  }
                } catch (err: any) {
                  // Log all errors to help debug
                  console.error(`❌ [${config.display_name} -> ${destinationChainId}] Error:`, err?.message || err)
                }
              }
            } else if (contractType === 'L2_L1') {
              // L2_L1 contract: has single saleCount for all requests
              try {
                // Create a chain-specific client for this L2 chain
                const l2Client = getPublicClientForChain(sourceChainId)
                
                // Get the total saleCount (not per destination)
                const currentSaleCount = await l2Client.readContract({
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
                console.log(`📍 [L2_L1] Total requests: ${totalRequests}`)

                // Fetch all requests and filter by destination
                for (let saleCount = 1; saleCount <= totalRequests; saleCount++) {
                  const requestKey = `${contractAddress}_all_${saleCount}`
                  if (!fullRefresh && fulfilledSaleCounts.has(requestKey)) {
                    continue // skip known fulfilled
                  }
                  
                  try {
                    console.log(`📦 [L2_L1] Fetching dealData for request ${saleCount}`)
                    const data = await l2Client.readContract({
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

                    console.log(`📋 [L2_L1] Parsed request ${saleCount}:`, requestData)

                    // If provider is not zero address, it's fulfilled
                    if (requestData.provider !== '0x0000000000000000000000000000000000000000') {
                      newFulfilled.add(requestKey)
                      continue // skip fulfilled
                    }

                    // Check for edited ctAmount on L1
                    const editedCtAmount = await getEditedCtAmount(requestData.hashValue, 'L2_L1')
                    if (editedCtAmount) {
                      console.log(`📝 Found edited ctAmount for hash ${requestData.hashValue}: ${editedCtAmount.toString()}`)
                      requestData.editedCtAmount = editedCtAmount
                    }

                    // Add request if it has a valid totalAmount (includes native token transfers where l2SourceToken is 0x0000...)
                    if (requestData.totalAmount > BigInt(0)) {
                      console.log(`✨ [L2_L1] Adding request ${saleCount} to pool`)
                      allRequestsArray.push({ 
                        saleCount, 
                        chainId: sourceChainId, 
                        chainName: config.display_name,
                        contractAddress: contractAddress,
                        contractType: 'L2_L1',
                        data: requestData 
                      })
                    } else {
                      console.log(`⚠️ [L2_L1] Request ${saleCount} has zero totalAmount, skipping`)
                    }
                  } catch (err) {
                    console.error(`❌ [L2_L1] Error fetching request ${saleCount} from ${config.display_name}:`, err)
                  }
                }
              } catch (err) {
                console.error(`Error fetching L2_L1 saleCount from ${config.display_name}:`, err)
              }
            }
        } catch (err) {
          console.error(`Error fetching from ${config.display_name}:`, err)
        }
      }

      // Sort by sale count descending (newest first)
      const sortedRequests = allRequestsArray.sort((a, b) => b.saleCount - a.saleCount)
      console.log(`🎯 [RequestPool] Total requests found: ${sortedRequests.length}`, sortedRequests)
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
          <p>Querying {l2Chains.length} L2 chains: {l2Chains.map(chain => `${chain.config.display_name} (${chain.type})`).join(', ')}</p>
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
                <button 
                  className={`filter-btn ${selectedToken === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSelectedToken('ALL')}
                >
                  ALL
                </button>
                {allTokens.slice(0, 3).map((token) => (
                  <button
                    key={token.symbol}
                    className={`filter-btn ${selectedToken === token.symbol ? 'active' : ''}`}
                    onClick={() => setSelectedToken(token.symbol)}
                  >
                    <Image src={token.logo} alt={token.symbol} width={20} height={20} style={{ borderRadius: '50%', marginRight: '6px', verticalAlign: 'middle' }} />
                    {token.symbol}
                  </button>
                ))}
                {allTokens.length > 3 && (
                  <div className="dropdown-wrapper">
                    <select 
                      className={`filter-dropdown ${selectedToken !== 'ALL' && !allTokens.slice(0, 3).find(t => t.symbol === selectedToken) ? 'active' : ''}`}
                      value={selectedToken !== 'ALL' && !allTokens.slice(0, 3).find(t => t.symbol === selectedToken) ? selectedToken : ''}
                      onChange={(e) => e.target.value && setSelectedToken(e.target.value)}
                    >
                      <option value="">More...</option>
                      {allTokens.map((token) => (
                        <option key={token.symbol} value={token.symbol}>
                          {token.symbol}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            
            <div className="filter-section">
              <span className="filter-label">Reward On</span>
              <div className="filter-buttons">
                <button 
                  className={`filter-btn ${selectedChain === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSelectedChain('ALL')}
                >
                  ALL
                </button>
                {allChains.slice(0, 2).map((chain) => (
                  <button
                    key={chain.id}
                    className={`filter-btn ${selectedChain === chain.name ? 'active' : ''}`}
                    onClick={() => setSelectedChain(chain.name)}
                  >
                    <Image src={chain.logo} alt={chain.name} width={20} height={20} style={{ borderRadius: '50%', marginRight: '6px', verticalAlign: 'middle' }} />
                    {chain.name}
                  </button>
                ))}
                <div className="dropdown-wrapper">
                  <select 
                    className={`filter-dropdown ${selectedChain !== 'ALL' && !allChains.slice(0, 2).find(c => c.name === selectedChain) ? 'active' : ''}`}
                    value={selectedChain !== 'ALL' && !allChains.slice(0, 2).find(c => c.name === selectedChain) ? selectedChain : ''}
                    onChange={(e) => e.target.value && setSelectedChain(e.target.value)}
                  >
                    <option value="">More...</option>
                    {allChains.map((chain) => (
                      <option key={chain.id} value={chain.name}>
                        {chain.name}
                      </option>
                    ))}
                  </select>
                </div>
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
              {requests
                .filter(req => req.data !== null)
                .filter(req => {
                  if (!req.data) return false
                  
                  // Filter by token
                  if (selectedToken !== 'ALL') {
                    const tokenData = allTokens.find(t => t.symbol === selectedToken)
                    if (tokenData) {
                      const requestTokenAddress = req.data.l2SourceToken.toLowerCase()
                      if (!tokenData.addresses.includes(requestTokenAddress)) {
                        return false
                      }
                    }
                  }
                  
                  // Filter by chain (reward on = source chain where request originated)
                  if (selectedChain !== 'ALL') {
                    if (req.chainName !== selectedChain) {
                      return false
                    }
                  }
                  
                  return true
                })
                .map((request, index) => {
                const data = request.data!
                const destinationChain = getChainName(data.l2DestinationChainId)
                // Use edited amount if available, otherwise use original ctAmount
                const actualCtAmount = data.editedCtAmount || data.ctAmount
                // Provider PROVIDES actualCtAmount on L1 (Ethereum)
                const provideAmount = formatTokenAmount(actualCtAmount, data.l2SourceToken)
                // Provider GETS REWARDED totalAmount on L2 source chain (where request came from)
                const rewardAmount = formatTokenAmount(data.totalAmount, data.l2SourceToken)
                const serviceFeeBigInt = data.totalAmount - actualCtAmount
                const serviceFeeAmount = formatTokenAmount(serviceFeeBigInt, data.l2SourceToken)
                const profitPercentage = ((Number(serviceFeeBigInt) / Number(data.totalAmount)) * 100).toFixed(2)

                return (
                  <div key={`request-${request.contractAddress}-${request.saleCount}`} className="table-row">
                    {/* Token Column */}
                    <div className="table-cell token-col">
                      <div className="token-info">
                        <span className="token-icon">{renderTokenLogo(data.l2SourceToken)}</span>
                        <span className="token-symbol">
                          {allTokens.find(t => t.addresses.includes(data.l2SourceToken.toLowerCase()))?.symbol || 'UNKNOWN'}
                        </span>
                      </div>
                    </div>

                    {/* Provide On Column - Provider sends ctAmount on Ethereum (L1) */}
                    <div className="table-cell provide-col">
                      <div className="amount-info">
                        <div className="amount-row">
                          <span className="amount-value">{provideAmount}</span>
                          {data.editedCtAmount && data.editedCtAmount !== data.ctAmount && (
                            <span
                              className="edited-badge"
                              title={`Original: ${formatTokenAmount(data.ctAmount, data.l2SourceToken)}`}
                            >
                              EDITED
                            </span>
                          )}
                        </div>
                        <div className="chain-info">
                          <span className="chain-icon">
                            <Image src={getChainLogo('Ethereum')} alt="Ethereum" width={16} height={16} style={{ borderRadius: '50%' }} />
                          </span>
                          <span className="chain-name">Ethereum</span>
                        </div>
                      </div>
                    </div>

                    {/* Reward On Column - Provider gets totalAmount on source L2 chain */}
                    <div className="table-cell reward-col">
                      <div className="amount-info">
                        <span className="amount-value">{rewardAmount}</span>
                        <span className="profit-badge">+{profitPercentage}%</span>
                        <div className="chain-info">
                          <span className="chain-icon">{renderChainLogo(request.chainName)}</span>
                          <span className="chain-name">{request.chainName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Request From Column */}
                    <div className="table-cell request-col">
                      <div className="chain-info">
                        <span className="chain-icon">{renderChainLogo(request.chainName)}</span>
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
            editedCtAmount: selectedRequest.data.editedCtAmount,
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
          align-items: center;
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
          height: 28px;
          display: inline-flex;
          align-items: center;
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

        .dropdown-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .filter-dropdown {
          background: rgba(26, 26, 26, 0.8);
          border: 1px solid #333333;
          border-radius: 20px;
          padding: 6px 28px 6px 12px;
          color: #9ca3af;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          height: 28px;
          display: inline-flex;
          align-items: center;
        }

        .filter-dropdown:hover {
          border-color: #6366f1;
          color: #ffffff;
        }

        .filter-dropdown:focus {
          outline: none;
          border-color: #6366f1;
          color: #ffffff;
        }

        .filter-dropdown.active {
          background: #6366f1;
          border-color: #6366f1;
          color: #ffffff;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
        }

        .filter-dropdown.active:hover {
          background: #5855eb;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
        }

        .filter-dropdown option {
          background: #1a1a1a;
          color: #ffffff;
          padding: 10px 14px;
        }

        .filter-dropdown option:hover {
          background: #262626;
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

        .amount-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .amount-value {
          color: #ffffff;
          font-size: 16px;
          font-weight: 600;
        }

        .edited-badge {
          background: #f59e0b;
          color: #000000;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
          cursor: help;
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
