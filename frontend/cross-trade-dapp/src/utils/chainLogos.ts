// Chain logo utilities
export const getChainLogo = (chainName: string): string => {
  const normalizedName = chainName.toLowerCase()

  if (normalizedName.includes('ethereum') || normalizedName.includes('sepolia')) {
    return '/eth.png'
  }
  if (normalizedName.includes('optimism') || normalizedName.includes('op')) {
    return '/op.png'
  }
  if (normalizedName.includes('base')) {
    return '/base.png'
  }
  if (normalizedName.includes('thanos')) {
    return '/eth.png' // Use ETH logo for Thanos (or add a specific one if available)
  }

  // Default fallback
  return '/eth.png'
}

// Token logo utilities
export const getTokenLogo = (tokenSymbol: string): string => {
  const symbol = tokenSymbol.toUpperCase()

  switch (symbol) {
    case 'ETH':
      return '/eth.png'
    case 'USDC':
      return '/usdc.png'
    case 'USDT':
      return '/usdt.png'
    case 'TON':
      return '/eth.png' // Add TON logo if available
    default:
      return '/eth.png'
  }
}
