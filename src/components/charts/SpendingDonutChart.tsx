"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ICategoryBreakdown } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface SpendingDonutChartProps {
  data: ICategoryBreakdown[];
  totalLabel?: string;
  totalValue?: number;
}

export function SpendingDonutChart({
  data,
  totalLabel,
  totalValue,
}: SpendingDonutChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-full text-[#9ca3af] text-sm">
        Sem dados
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 h-full">
      <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={58}
              paddingAngle={2}
              dataKey="amount"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {totalValue !== undefined && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-white text-xs font-semibold leading-tight">
                {formatCurrency(totalValue)}
              </p>
              {totalLabel && (
                <p className="text-[#9ca3af] text-[9px]">{totalLabel}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[#9ca3af] text-xs truncate flex-1">
              {item.percentage}% {item.category}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
