import { getRecentWTONBurns, getRecentWTONMints, getBurnStats } from "@/lib/data";
import { ExternalLink, Flame, ArrowRightLeft } from "lucide-react";
import type { BurnEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function BurnsPage() {
  const stats = await getBurnStats();
  await sleep(600);
  const burns = await getRecentWTONBurns(50);
  await sleep(600);
  const mints = await getRecentWTONMints(50);

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleDateString();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
          <Flame className="h-10 w-10 text-orange-500" />
          Burn History
        </h1>
        <p className="text-gray-400 max-w-3xl">
          WTON (Wrapped TON) is a wrapper token for TON on Ethereum. When users call{" "}
          <code className="bg-gray-800 px-2 py-1 rounded text-sm">swapToTON()</code>, their WTON is
          burned and TON is released back to them. This tracker shows all burn events — which are
          essentially unwrapping operations, not permanent value destruction.
        </p>
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>Note:</strong> {stats.wtonBurnCount.toLocaleString()} total burns tracked. All
            burns are <code className="bg-gray-800 px-1 rounded">swapToTON</code> unwraps — zero
            direct <code className="bg-gray-800 px-1 rounded">burn()</code> calls exist.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-800">
        <button className="px-4 py-2 border-b-2 border-orange-500 text-orange-500 font-semibold">
          Burns (swapToTON)
        </button>
      </div>

      {/* Burns table */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Block
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {burns.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No burns found
                  </td>
                </tr>
              )}
              {burns.map((burn, i) => (
                <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a
                      href={`https://etherscan.io/tx/${burn.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-2 font-mono text-sm"
                    >
                      {formatAddress(burn.txHash)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-300">
                    {formatAddress(burn.from)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-orange-400 font-semibold">
                    {burn.amount.toLocaleString("en-US", { maximumFractionDigits: 2 })} WTON
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {formatTime(burn.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {burn.blockNumber.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
