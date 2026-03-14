"use client";

import { getMonthName } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Month {
  year: number;
  month: number;
}

interface MonthSelectorProps {
  months: Month[];
  selected: Month;
  onSelect: (m: Month) => void;
}

export function MonthSelector({ months, selected, onSelect }: MonthSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      {months.map((m) => {
        const isActive = m.year === selected.year && m.month === selected.month;
        const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();
        return (
          <button
            key={`${m.year}-${m.month}`}
            onClick={() => onSelect(m)}
            className={cn(
              "flex items-center justify-between gap-2 px-3 md:px-4 py-2.5 rounded-lg transition-all text-sm text-left min-w-0",
              isActive
                ? "bg-[#00d4aa] text-[#0d0d0d] font-semibold"
                : "border border-[#2a2a3e] text-white hover:border-[#00d4aa]/40"
            )}
          >
            <span className="truncate min-w-0">{getMonthName(m.month)}</span>
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <span className={cn("shrink-0", isActive ? "text-[#0d0d0d]/70" : "text-[#9ca3af]")}>
                {m.year}
              </span>
              {isActive && (
                <span className="text-[10px] md:text-xs text-[#0d0d0d]/70 truncate">
                  dia 01 até dia {daysInMonth}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
