import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { optimismSepolia, sepolia } from '@reown/appkit/networks'
import { defineChain } from 'viem'
import {env} from 'next-runtime-env'

// Get projectId from https://cloud.reown.com
export const projectId = env('NEXT_PUBLIC_PROJECT_ID') || "b56e18d47c72ab683b10814fe9495694" // this is a public projectId only to use on localhost

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Parse chain configurations from environment - support both L2_L2 and L2_L1
const chainConfigL2L2String = env('NEXT_PUBLIC_CHAIN_CONFIG_L2_L2')
const chainConfigL2L1String = env('NEXT_PUBLIC_CHAIN_CONFIG_L2_L1')

// Check if at least one config is provided
if (!chainConfigL2L2String && !chainConfigL2L1String) {
  throw new Error('No chain configuration found. Please set NEXT_PUBLIC_CHAIN_CONFIG_L2_L2 or NEXT_PUBLIC_CHAIN_CONFIG_L2_L1')
}

// Parse both configs (if available)
let chainConfigL2L2: Record<string, any> = {}
let chainConfigL2L1: Record<string, any> = {}

if (chainConfigL2L2String) {
  try {
    chainConfigL2L2 = JSON.parse(chainConfigL2L2String)
    console.log('✅ Loaded L2_L2 chain configuration')
  } catch (error) {
    console.error('❌ Invalid JSON in NEXT_PUBLIC_CHAIN_CONFIG_L2_L2:', error)
  }
}

if (chainConfigL2L1String) {
  try {
    chainConfigL2L1 = JSON.parse(chainConfigL2L1String)
    console.log('✅ Loaded L2_L1 chain configuration')
  } catch (error) {
    console.error('❌ Invalid JSON in NEXT_PUBLIC_CHAIN_CONFIG_L2_L1:', error)
  }
}

// Function to create chain definition from config
function createChainFromConfig(chainId: string, config: any) {
  const id = parseInt(chainId)
  
  return defineChain({
    id,
    name: config.name,
    network: config.name.toLowerCase().replace(/\s+/g, '-'),
    nativeCurrency: {
      name: config.native_token_name || config.displayName || config.name,
      symbol: config.native_token_symbol || 'ETH', // Use native_token_symbol from config or default to ETH
      decimals: 18,
    },
    rpcUrls: {
      default: { http: [config.rpcUrl] },
      public: { http: [config.rpcUrl] },
    },
    blockExplorers: config.blockExplorerUrl ? {
      default: {
        name: `${config.displayName || config.name} Explorer`,
        url: config.blockExplorerUrl,
      },
    } : undefined,
    testnet: true, // All chains in your config appear to be testnets
  })
}

// Merge both configs (L2_L2 takes priority if same chainId exists in both)
const mergedChainConfig = { ...chainConfigL2L1, ...chainConfigL2L2 }

// Create dynamic chain definitions from merged config
const dynamicChains = Object.entries(mergedChainConfig).map(([chainId, config]) => 
  createChainFromConfig(chainId, config)
)

console.log(`🔗 Loaded ${dynamicChains.length} dynamic chains for Wagmi`, 
  dynamicChains.map(c => ({ id: c.id, name: c.name }))
)

// Combine with predefined chains and dynamic chains
export const networks = [optimismSepolia, sepolia, ...dynamicChains]

// Helper functions to get specific configurations
export function getL2L2Config() {
  const configString = env('NEXT_PUBLIC_CHAIN_CONFIG_L2_L2')
  if (!configString) throw new Error('NEXT_PUBLIC_CHAIN_CONFIG_L2_L2 is not defined')
  return JSON.parse(configString)
}

export function getL2L1Config() {
  const configString = env('NEXT_PUBLIC_CHAIN_CONFIG_L2_L1')
  if (!configString) throw new Error('NEXT_PUBLIC_CHAIN_CONFIG_L2_L1 is not defined')
  return JSON.parse(configString)
}

// Function to create networks from specific config
export function createNetworksFromConfig(configString: string) {
  const config = JSON.parse(configString)
  const dynamicChains = Object.entries(config).map(([chainId, chainConfig]) => 
    createChainFromConfig(chainId, chainConfig)
  )
  return [optimismSepolia, sepolia, ...dynamicChains]
}

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  projectId,
  networks
})

export const config = wagmiAdapter.wagmiConfig