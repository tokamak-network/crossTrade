export interface BurnStats {
  totalBurned: number;
  totalBurnedUSD: number;
  totalSupply: number;
  circulatingSupply: number;
  burnPercentage: number;
  tonPrice: number;
  marketCap: number;
  stakedTON: number;
  wtonBurnCount: number;
  wtonCurrentSupply: number;
  wtonTotalMinted: number;
  deadAddressBalance: number;
}

export interface BurnEvent {
  txHash: string;
  from: string;
  to: string;
  amount: number;
  token: "TON" | "WTON";
  blockNumber: number;
  timestamp: number;
  method?: string;
}

export interface TokenHolder {
  address: string;
  balance: number;
  percentage: number;
}

export interface LeaderboardEntry {
  address: string;
  totalBurned: number;
  burnCount: number;
  badge: string;
  lastBurnDate: number;
}

export interface SupplySnapshot {
  date: string;
  supply: number;
  burned: number;
}
