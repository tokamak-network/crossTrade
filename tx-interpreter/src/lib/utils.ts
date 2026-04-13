// ============================================================================
// Utility: cn() — conditional class merging (shadcn/ui pattern)
// ============================================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortenAddress(address: string, chars = 6): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatEth(value: string, decimals = 6): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "0";
  if (num === 0) return "0";
  if (Math.abs(num) < 0.000001) return "< 0.000001";
  return num.toFixed(decimals).replace(/\.?0+$/, "");
}

export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

export function formatGas(gas: string): string {
  const num = parseInt(gas);
  if (isNaN(num)) return gas;
  return num.toLocaleString();
}

export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}
