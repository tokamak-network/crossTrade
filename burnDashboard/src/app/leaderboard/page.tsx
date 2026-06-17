import { getLeaderboard, getBurnStats } from "@/lib/data";
import { Trophy, Flame } from "lucide-react";

export const dynamic = "force-dynamic";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard(100);
  await sleep(600);
  const stats = await getBurnStats();

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
          <Trophy className="h-10 w-10 text-yellow-500" />
          Top Burners
        </h1>
        <p className="text-gray-400">
          Addresses ranked by total WTON unwrapped (swapToTON calls). Total tracked:{" "}
          <span className="text-white font-semibold">
            {stats.wtonBurnCount.toLocaleString()} burns
          </span>
        </p>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Total Burned
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Burn Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Badge
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No data available
                  </td>
                </tr>
              )}
              {leaderboard.map((entry, i) => (
                <tr
                  key={i}
                  className={`hover:bg-gray-800/30 transition-colors ${
                    i < 3 ? "bg-yellow-500/5" : ""
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`flex items-center gap-2 ${
                        i === 0
                          ? "text-yellow-400"
                          : i === 1
                          ? "text-gray-300"
                          : i === 2
                          ? "text-orange-400"
                          : "text-gray-400"
                      } font-bold`}
                    >
                      {i + 1}
                      {i < 3 && <Trophy className="h-4 w-4" />}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-300">
                    {formatAddress(entry.address)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-orange-400 font-semibold">
                    {entry.totalBurned.toLocaleString("en-US", { maximumFractionDigits: 0 })} WTON
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {entry.burnCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-2xl">{entry.badge}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
