import type { BurnStats } from "@/lib/types";

interface SupplyBreakdownProps {
  stats: BurnStats;
}

export default function SupplyBreakdown({ stats }: SupplyBreakdownProps) {
  const totalMinted = stats.wtonTotalMinted;
  const currentSupply = stats.wtonCurrentSupply;
  const burned = stats.totalBurned;
  const deadBalance = stats.deadAddressBalance;

  // Calculate percentages (normalize if over 100%)
  const grandTotal = Math.max(totalMinted, currentSupply + burned + deadBalance);
  const supplyPct = (currentSupply / grandTotal) * 100;
  const burnedPct = (burned / grandTotal) * 100;
  const deadPct = (deadBalance / grandTotal) * 100;

  const segments = [
    { label: "Current Supply", value: currentSupply, pct: supplyPct, color: "bg-green-500" },
    { label: "Burned (Unwrapped)", value: burned, pct: burnedPct, color: "bg-orange-500" },
    { label: "Dead Address", value: deadBalance, pct: deadPct, color: "bg-gray-500" },
  ];

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Supply Breakdown</h2>
      
      {/* Bar chart */}
      <div className="flex h-8 rounded-lg overflow-hidden mb-4">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={seg.color}
            style={{ width: `${seg.pct}%` }}
            title={`${seg.label}: ${seg.pct.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${seg.color}`} />
              <span className="text-gray-300">{seg.label}</span>
            </div>
            <div className="font-mono text-gray-400">
              {seg.value.toLocaleString("en-US", { maximumFractionDigits: 0 })} ({seg.pct.toFixed(1)}%)
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Total Ever Minted</span>
          <span className="font-mono font-bold">
            {totalMinted.toLocaleString("en-US", { maximumFractionDigits: 0 })} WTON
          </span>
        </div>
      </div>
    </div>
  );
}
