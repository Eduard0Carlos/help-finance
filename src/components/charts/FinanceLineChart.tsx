"use client";

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
  expenseLabel?: string;
  incomeLabel?: string;
  expenseColor?: string;
  incomeColor?: string;
}

type UnifiedDataPoint = {
  label: string;
  expense: number;
  income: number;
};

export function FinanceLineChart({
  expenseData,
  incomeData,
  expenseLabel = "Despesas",
  incomeLabel = "Receitas",
  expenseColor = "#ef4444",
  incomeColor = "#22c55e",
}: FinanceLineChartProps) {
  const data: UnifiedDataPoint[] = expenseData.map((expensePoint, index) => ({
    label: expensePoint.label,
    expense: expensePoint.value,
    income: incomeData[index]?.value ?? 0,
  }));

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: expenseColor }}
          />
          <span className="text-[#9ca3af]">{expenseLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: incomeColor }}
          />
          <span className="text-[#9ca3af]">{incomeLabel}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={expenseColor} stopOpacity={0.35} />
                <stop offset="95%" stopColor={expenseColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={incomeColor} stopOpacity={0.35} />
                <stop offset="95%" stopColor={incomeColor} stopOpacity={0} />
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
              formatter={(value, name) => [
                formatCurrency(Number(value)),
                name === "expense" ? expenseLabel : incomeLabel,
              ]}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Area
              type="monotone"
              dataKey="expense"
              name="expense"
              stroke={expenseColor}
              strokeWidth={2}
              fill="url(#expenseGradient)"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="income"
              name="income"
              stroke={incomeColor}
              strokeWidth={2}
              fill="url(#incomeGradient)"
              fillOpacity={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
