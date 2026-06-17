"use client";

import type { SupplySnapshot } from "@/lib/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface SupplyChartProps {
  data: SupplySnapshot[];
}

export default function SupplyChart({ data }: SupplyChartProps) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Supply History (30 Days)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            stroke="#9CA3AF"
            tick={{ fill: "#9CA3AF" }}
          />
          <YAxis stroke="#9CA3AF" tick={{ fill: "#9CA3AF" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1F2937",
              border: "1px solid #374151",
              borderRadius: "0.5rem",
            }}
            labelStyle={{ color: "#F3F4F6" }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="supply"
            stroke="#10B981"
            strokeWidth={2}
            name="Supply"
          />
          <Line
            type="monotone"
            dataKey="burned"
            stroke="#F59E0B"
            strokeWidth={2}
            name="Burned"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
