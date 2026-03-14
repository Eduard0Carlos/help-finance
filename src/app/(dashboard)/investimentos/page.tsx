"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MonthSelector } from "@/components/ui/MonthSelector";
import dynamic from "next/dynamic";
const SpendingDonutChart = dynamic(
  () => import("@/components/charts/SpendingDonutChart").then((m) => m.SpendingDonutChart),
  { ssr: false }
);
const FinanceLineChart = dynamic(
  () => import("@/components/charts/FinanceLineChart").then((m) => m.FinanceLineChart),
  { ssr: false }
);
import { AddInvestmentModal } from "@/components/investments/AddInvestmentModal";
import { useBalance } from "@/components/layout/BalanceContext";
import { IInvestment, ICategoryBreakdown, IChartDataPoint, INVESTMENT_PROFILES } from "@/types";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { Eye, EyeOff, TrendingUp, TrendingDown, Trash2 } from "lucide-react";

interface Month {
  year: number;
  month: number;
}

function getLast6Months(): Month[] {
  const months: Month[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
}

const TYPE_COLORS: Record<string, string> = {
  acao: "#f59e0b",
  fundo: "#00d4aa",
  international: "#3b82f6",
  renda_fixa: "#a855f7",
};

const TYPE_LABELS: Record<string, string> = {
  acao: "Ações",
  fundo: "Fundos",
  international: "Internacional",
  renda_fixa: "Renda Fixa",
};

export default function InvestimentosPage() {
  const { hideBalance, toggleBalance } = useBalance();
  const now = new Date();
  const [selected, setSelected] = useState<Month>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [investments, setInvestments] = useState<IInvestment[]>([]);
  const [investmentGoal, setInvestmentGoal] = useState(4000);
  const [investmentProfile, setInvestmentProfile] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const months = getLast6Months();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, userRes] = await Promise.all([
        fetch("/api/investments"),
        fetch("/api/user"),
      ]);

      let invData: IInvestment[] = [];
      if (invRes.ok) invData = await invRes.json();

      if (userRes.ok) {
        const u = await userRes.json();
        setInvestmentGoal(u.investmentGoal ?? 4000);
        setInvestmentProfile(u.investmentProfile ?? 1);
      }

      // Enrich with brapi prices
      if (invData.length > 0) {
        const tickers = invData.map((i) => i.ticker).join(",");
        try {
          const priceRes = await fetch(`/api/investments/prices?tickers=${tickers}`);
          if (priceRes.ok) {
            const prices: Array<{
              symbol: string;
              regularMarketPrice: number;
              regularMarketChangePercent: number;
              regularMarketChange: number;
            }> = await priceRes.json();
            const priceMap = new Map(prices.map((p) => [p.symbol, p]));
            invData = invData.map((inv) => {
              const quote = priceMap.get(inv.ticker);
              if (quote) {
                return {
                  ...inv,
                  currentPrice: quote.regularMarketPrice,
                  change: quote.regularMarketChange,
                  changePercent: quote.regularMarketChangePercent,
                };
              }
              return inv;
            });
          }
        } catch {
          // brapi unavailable - use averagePrice
        }
      }

      setInvestments(invData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalPortfolio = investments.reduce((s, i) => {
    const price = i.currentPrice ?? i.averagePrice;
    return s + price * i.quantity;
  }, 0);

  // Type breakdown for donut
  const byType: Record<string, number> = {};
  investments.forEach((i) => {
    const price = i.currentPrice ?? i.averagePrice;
    byType[i.type] = (byType[i.type] ?? 0) + price * i.quantity;
  });
  const typeBreakdown: ICategoryBreakdown[] = Object.entries(byType)
    .sort(([, a], [, b]) => b - a)
    .map(([type, amount]) => ({
      category: TYPE_LABELS[type] ?? type,
      amount,
      percentage: totalPortfolio > 0 ? Math.round((amount / totalPortfolio) * 100) : 0,
      color: TYPE_COLORS[type] ?? "#6b7280",
    }));

  // Variation chart (12 months - simulated from purchase data)
  const variationData: IChartDataPoint[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(selected.year, selected.month - 11 + i, 1);
    return {
      label: getMonthName(d.getMonth()).slice(0, 3).toUpperCase(),
      value: 0,
    };
  });

  investments.forEach((inv) => {
    const purchaseDate = new Date(inv.purchaseDate);
    const idx =
      (purchaseDate.getFullYear() - selected.year) * 12 +
      purchaseDate.getMonth() -
      (selected.month - 11);
    if (idx >= 0 && idx < 12) {
      variationData[idx]!.value += inv.averagePrice * inv.quantity;
    }
  });

  const dummyIncome = variationData.map((d) => ({ ...d, value: d.value * 1.05 }));

  const profileInfo =
    INVESTMENT_PROFILES.find((p) => p.value === investmentProfile) ??
    INVESTMENT_PROFILES[0]!;

  const mask = (v: string) => (hideBalance ? "R$ ***" : v);

  async function deleteInvestment(id: string) {
    await fetch(`/api/investments/${id}`, { method: "DELETE" });
    setInvestments((prev) => prev.filter((i) => i._id !== id));
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Investimentos" />

      <main className="flex-1 overflow-auto p-5 grid grid-cols-3 gap-4 content-start">
        {/* Column 1 */}
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-[#9ca3af]">Carteira de Investimentos</p>
            </div>
            <div className="flex items-center gap-2 border border-[#2a2a3e] rounded-lg px-3 py-2 mb-3">
              <button onClick={toggleBalance} className="text-[#9ca3af] hover:text-white transition-colors">
                {hideBalance ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <span className="text-white text-sm font-semibold">
                {hideBalance ? "R$ ***********" : formatCurrency(totalPortfolio)}
              </span>
            </div>
            <p className="text-xs text-[#9ca3af] mb-1">Meta de investimentos</p>
            <ProgressBar
              value={totalPortfolio}
              max={investmentGoal}
              showValues
              formatValue={(v) => mask(formatCurrency(v))}
            />
          </Card>

          <Card>
            <p className="text-xs text-[#9ca3af] mb-3">Meses</p>
            <MonthSelector months={months} selected={selected} onSelect={setSelected} />
          </Card>
        </div>

        {/* Column 2 - Investments List */}
        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#9ca3af]">Investimentos</p>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : investments.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[#9ca3af] text-sm">Nenhum investimento</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
              {investments.map((inv) => {
                const currentPrice = inv.currentPrice ?? inv.averagePrice;
                const totalValue = currentPrice * inv.quantity;
                const hasChange = inv.changePercent !== undefined;
                return (
                  <div
                    key={inv._id}
                    className="flex items-center justify-between py-2 border-b border-[#1e1e2e] last:border-0 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: TYPE_COLORS[inv.type] ?? "#6b7280" }}
                      />
                      <div className="min-w-0">
                        <p className="text-white text-sm font-bold">{inv.ticker}</p>
                        <p className="text-[#9ca3af] text-xs truncate">{inv.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-white text-xs font-semibold">
                          {mask(formatCurrency(totalValue))}
                        </p>
                        {hasChange && (
                          <p
                            className={`text-[10px] font-semibold ${
                              (inv.changePercent ?? 0) >= 0
                                ? "text-[#22c55e]"
                                : "text-[#ef4444]"
                            }`}
                          >
                            {(inv.changePercent ?? 0) >= 0 ? (
                              <TrendingUp size={8} className="inline mr-0.5" />
                            ) : (
                              <TrendingDown size={8} className="inline mr-0.5" />
                            )}
                            {(inv.changePercent ?? 0) >= 0 ? "+" : ""}
                            {mask(`${(inv.changePercent ?? 0).toFixed(2)}%`)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteInvestment(inv._id)}
                        className="text-[#9ca3af] hover:text-[#ef4444] transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={() => setAddOpen(true)}
            className="mt-3 w-full bg-[#2a2a3e] hover:bg-[#3a3a5e] text-white text-sm py-2 rounded-lg transition-colors"
          >
            Adicionar
          </button>
        </Card>

        {/* Column 3 */}
        <div className="flex flex-col gap-4">
          {/* Portfolio Donut */}
          <Card gradient>
            <p className="text-xs text-[#9ca3af] mb-2">Carteira de Investimentos</p>
            <SpendingDonutChart
              data={typeBreakdown}
              totalValue={totalPortfolio}
            />
          </Card>

          {/* Variation Chart */}
          <Card className="flex flex-col" style={{ minHeight: 160 }}>
            <p className="text-xs text-[#9ca3af] mb-2">Variação</p>
            <div className="flex-1 min-h-0">
              <FinanceLineChart expenseData={variationData} incomeData={dummyIncome} />
            </div>
          </Card>

          {/* Investment Profile */}
          <Card>
            <p className="text-xs text-[#9ca3af] mb-3">Perfil de Investimento</p>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <svg width="64" height="64" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="32" cy="32" r="24" fill="none" stroke="#2a2a3e" strokeWidth="6" />
                  <circle
                    cx="32"
                    cy="32"
                    r="24"
                    fill="none"
                    stroke="#00d4aa"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 24}`}
                    strokeDashoffset={`${2 * Math.PI * 24 * (1 - investmentProfile / 5)}`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{investmentProfile}</span>
                </div>
              </div>
              <div>
                <p className="text-white font-bold text-base">{profileInfo.label}</p>
                <p className="text-[#9ca3af] text-xs mt-0.5">Nível {investmentProfile}/5</p>
              </div>
            </div>
          </Card>
        </div>
      </main>

      <AddInvestmentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}
