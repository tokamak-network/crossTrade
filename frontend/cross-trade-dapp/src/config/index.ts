import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { optimismSepolia, sepolia } from '@reown/appkit/networks'
import { defineChain } from 'viem'

// Get projectId from https://cloud.reown.com
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "b56e18d47c72ab683b10814fe9495694" // this is a public projectId only to use on localhost

if (!projectId) {
  throw new Error('Project ID is not defined')
}

export const thanosSepolia = defineChain({
  id: 111551119090,
  name: 'Thanos Sepolia',
  network: 'thanos-sepolia',
  nativeCurrency: {
    name: 'Tokamak Network',
    symbol: 'TON',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.thanos-sepolia.tokamak.network'] },
    public: { http: ['https://rpc.thanos-sepolia.tokamak.network'] },
  },
  blockExplorers: {
    default: {
      name: 'Thanos Sepolia Explorer',
      url: 'https://explorer.thanos-sepolia-test.tokamak.network',
    },
  },
  testnet: true,
})

export const networks = [optimismSepolia, sepolia, thanosSepolia]

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  projectId,
  networks
})

export const config = wagmiAdapter.wagmiConfig