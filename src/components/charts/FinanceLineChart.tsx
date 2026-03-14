"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { IChartDataPoint } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface FinanceLineChartProps {
  expenseData: IChartDataPoint[];
  incomeData: IChartDataPoint[];
}

export function FinanceLineChart({ expenseData, incomeData }: FinanceLineChartProps) {
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");
  const data = activeTab === "expense" ? expenseData : incomeData;
  const color = activeTab === "expense" ? "#00d4aa" : "#22c55e";

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveTab("expense")}
          className={`text-sm font-medium transition-colors ${
            activeTab === "expense" ? "text-white" : "text-[#9ca3af]"
          }`}
        >
          Despesas
        </button>
        <button
          onClick={() => setActiveTab("income")}
          className={`text-sm font-medium transition-colors ${
            activeTab === "income" ? "text-white" : "text-[#9ca3af]"
          }`}
        >
          Ganhos
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "#1a1a2e",
                border: "1px solid #2a2a3e",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "12px",
              }}
              formatter={(value) => [formatCurrency(Number(value)), ""]}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill="url(#colorGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
