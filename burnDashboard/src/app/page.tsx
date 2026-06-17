import { getBurnStats, getRecentWTONBurns, getSupplyHistory } from "@/lib/data";
import BurnHero from "@/components/BurnHero";
import BurnStats from "@/components/BurnStats";
import RecentBurns from "@/components/RecentBurns";
import SupplyBreakdown from "@/components/SupplyBreakdown";
import SupplyChartWrapper from "@/components/SupplyChartWrapper";

export const dynamic = "force-dynamic";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function DashboardPage() {
  // Serialize API calls to avoid rate limiting
  const stats = await getBurnStats();
  await sleep(600);
  const recentBurns = await getRecentWTONBurns(10);
  await sleep(600);
  const supplyHistory = await getSupplyHistory(30);

  return (
    <div className="space-y-8">
      <BurnHero stats={stats} />
      <BurnStats stats={stats} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SupplyBreakdown stats={stats} />
        <RecentBurns burns={recentBurns} />
      </div>
      <SupplyChartWrapper data={supplyHistory} />
    </div>
  );
}
