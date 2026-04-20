import type { BurnStats as IBurnStats } from "@/lib/types";
import { TrendingUp, Coins, Percent, DollarSign } from "lucide-react";

interface BurnStatsProps {
  stats: IBurnStats;
}

export default function BurnStats({ stats }: BurnStatsProps) {
  const cards = [
    {
      icon: Coins,
      label: "Total Supply",
      value: stats.totalSupply.toLocaleString("en-US", { maximumFractionDigits: 0 }),
      suffix: "TON",
      color: "text-blue-400",
    },
    {
      icon: TrendingUp,
      label: "Market Cap",
      value: `$${(stats.marketCap / 1_000_000).toFixed(1)}M`,
      color: "text-green-400",
    },
    {
      icon: Percent,
      label: "Burn Rate",
      value: Math.min(stats.burnPercentage, 99.9).toFixed(2) + "%",
      color: "text-orange-400",
    },
    {
      icon: DollarSign,
      label: "TON Price",
      value: `$${stats.tonPrice.toFixed(2)}`,
      color: "text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <card.icon className={`h-5 w-5 ${card.color}`} />
            <div className="text-sm text-gray-400">{card.label}</div>
          </div>
          <div className="text-2xl font-bold">
            {card.value}
            {card.suffix && <span className="text-sm text-gray-400 ml-1">{card.suffix}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
