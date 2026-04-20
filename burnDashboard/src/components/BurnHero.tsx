import type { BurnStats } from "@/lib/types";
import { Flame } from "lucide-react";

interface BurnHeroProps {
  stats: BurnStats;
}

export default function BurnHero({ stats }: BurnHeroProps) {
  return (
    <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Flame className="h-12 w-12 text-orange-500" />
            <div>
              <h1 className="text-4xl font-bold">
                {stats.totalBurned.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
              </h1>
              <p className="text-gray-400">WTON Burned</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
            <div>
              <div className="text-2xl font-bold text-orange-400">
                {stats.wtonBurnCount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">Burn Events</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">
                ${stats.totalBurnedUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
              <div className="text-sm text-gray-400">Value Burned (USD)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {Math.min(stats.burnPercentage, 99.9).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">Supply Cycled</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                {stats.wtonCurrentSupply.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
              </div>
              <div className="text-sm text-gray-400">Current WTON Supply</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
