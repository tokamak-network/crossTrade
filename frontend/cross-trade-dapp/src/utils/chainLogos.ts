import { getMergedChainConfig } from '@/config'

export const getChainLogo = (chainName: string): string => {
  if (!chainName) return '/erc20.png'

  const name = chainName.toLowerCase()

  if (name.includes('optimism') || name.includes('op sepolia')) return '/op.png'
  if (name.includes('base')) return '/base.png'
  if (name.includes('ethereum') || name.includes('sepolia')) return '/eth.png'

  return '/erc20.png'
}

export const getExplorerUrl = (chainId: number, txHash: string): string => {
  if (!txHash || !chainId) return '#'

  const config = getMergedChainConfig()[chainId.toString()]
  return config?.block_explorer_url ? `${config.block_explorer_url}/tx/${txHash}` : '#'
}

export const getTokenLogo = (tokenSymbol: string): string => {
  if (!tokenSymbol) return '/erc20.png'

  switch (tokenSymbol.toUpperCase()) {
    case 'ETH':
    case 'WETH':
      return '/eth.png'
    case 'USDC':
      return '/usdc.png'
    case 'USDT':
      return '/usdt.png'
    default:
      return '/erc20.png'
  }
}
