import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { optimismSepolia, sepolia } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { defineChain } from 'viem'

// Get projectId from https://cloud.reown.com
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "b56e18d47c72ab683b10814fe9495694" // this is a public projectId only to use on localhost

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Parse chain configuration from environment
// You can choose between L2_L2 or L2_L1 configuration
const chainConfigString = process.env.NEXT_PUBLIC_CHAIN_CONFIG_L2_L2 || process.env.NEXT_PUBLIC_CHAIN_CONFIG_L2_L1 || process.env.NEXT_PUBLIC_CHAIN_CONFIG
if (!chainConfigString) {
  throw new Error('No chain configuration found. Please set NEXT_PUBLIC_CHAIN_CONFIG_L2_L2, NEXT_PUBLIC_CHAIN_CONFIG_L2_L1, or NEXT_PUBLIC_CHAIN_CONFIG')
}

let chainConfig: Record<string, any>
try {
  chainConfig = JSON.parse(chainConfigString)
} catch (error) {
  throw new Error('Invalid JSON in chain configuration')
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

// Create dynamic chain definitions
const dynamicChains = Object.entries(chainConfig).map(([chainId, config]) => 
  createChainFromConfig(chainId, config)
)

// Combine with predefined chains and dynamic chains
export const networks = [optimismSepolia, sepolia, ...dynamicChains]

// Helper functions to get specific configurations
export function getL2L2Config() {
  const configString = process.env.NEXT_PUBLIC_CHAIN_CONFIG_L2_L2
  if (!configString) throw new Error('NEXT_PUBLIC_CHAIN_CONFIG_L2_L2 is not defined')
  return JSON.parse(configString)
}

export function getL2L1Config() {
  const configString = process.env.NEXT_PUBLIC_CHAIN_CONFIG_L2_L1
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