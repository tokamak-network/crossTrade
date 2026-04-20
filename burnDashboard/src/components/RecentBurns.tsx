"use client";

import type { BurnEvent } from "@/lib/types";
import { ExternalLink } from "lucide-react";

interface RecentBurnsProps {
  burns: BurnEvent[];
}

export default function RecentBurns({ burns }: RecentBurnsProps) {
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatTime = (ts: number) => {
    const date = new Date(ts * 1000);
    const now = Date.now();
    const diff = now - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${Math.floor(diff / (1000 * 60))}m ago`;
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Recent Burns</h2>
      <div className="space-y-3">
        {burns.length === 0 && (
          <div className="text-gray-400 text-center py-8">No recent burns</div>
        )}
        {burns.map((burn, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="text-orange-400 font-mono font-bold">
                {burn.amount.toLocaleString("en-US", { maximumFractionDigits: 2 })} {burn.token}
              </div>
              <div className="text-gray-500">from</div>
              <div className="text-gray-300 font-mono text-sm">
                {formatAddress(burn.from)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-gray-400 text-sm">{formatTime(burn.timestamp)}</div>
              <a
                href={`https://etherscan.io/tx/${burn.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
