"use client";

import dynamic from "next/dynamic";
import type { SupplySnapshot } from "@/lib/types";

const SupplyChart = dynamic(() => import("./SupplyChart"), { ssr: false });

interface SupplyChartWrapperProps {
  data: SupplySnapshot[];
}

export default function SupplyChartWrapper({ data }: SupplyChartWrapperProps) {
  return <SupplyChart data={data} />;
}
