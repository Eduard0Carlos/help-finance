"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/charts/ProgressRing";
import { ProgressBar } from "@/components/ui/ProgressBar";
import dynamic from "next/dynamic";
const FinanceLineChart = dynamic(
  () => import("@/components/charts/FinanceLineChart").then((m) => m.FinanceLineChart),
  { ssr: false }
);
const SpendingDonutChart = dynamic(
  () => import("@/components/charts/SpendingDonutChart").then((m) => m.SpendingDonutChart),
  { ssr: false }
);
import { useBalance } from "@/components/layout/BalanceContext";
import { ITransaction, IInvestment, ICategoryBreakdown, IChartDataPoint } from "@/types";
import { formatCurrency, getMonthName, getCategoryColor } from "@/lib/utils";
import { TrendingUp, TrendingDown, Plus, FileText, BarChart2, FileBarChart } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { hideBalance } = useBalance();
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [investments, setInvestments] = useState<IInvestment[]>([]);
  const [monthlyFamilyLimit, setMonthlyFamilyLimit] = useState(10500);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  useEffect(() => {
    async function load() {
      try {
        const [txRes, invRes, userRes] = await Promise.all([
          fetch(`/api/transactions?year=${currentYear}&month=${currentMonth}`),
          fetch("/api/investments"),
          fetch("/api/user"),
        ]);
        if (txRes.ok) setTransactions(await txRes.json());
        if (invRes.ok) setInvestments(await invRes.json());
        if (userRes.ok) {
          const user = await userRes.json();
          setMonthlyFamilyLimit(user.monthlyFamilyLimit ?? 10500);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentYear, currentMonth]);

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const monthlyExpenseProgress = Math.min(
    100,
    Math.round((totalExpense / Math.max(monthlyFamilyLimit, 1)) * 100)
  );

  // Category breakdown for donut
  const expenseByCategory: Record<string, number> = {};
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      expenseByCategory[t.category] = (expenseByCategory[t.category] ?? 0) + t.amount;
    });

  const categoryBreakdown: ICategoryBreakdown[] = Object.entries(expenseByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat, amount]) => ({
      category: cat,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      color: getCategoryColor(cat),
    }));

  // Build 12-month chart data
  const expenseData: IChartDataPoint[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(currentYear, currentMonth - 11 + i, 1);
    return {
      label: getMonthName(d.getMonth()).slice(0, 3).toUpperCase(),
      value: 0,
    };
  });

  const incomeData: IChartDataPoint[] = expenseData.map((d) => ({ ...d }));

  transactions.forEach((t) => {
    const d = new Date(t.date);
    const idx =
      (d.getFullYear() - currentYear) * 12 + d.getMonth() - (currentMonth - 11);
    if (idx >= 0 && idx < 12) {
      if (t.type === "expense") expenseData[idx]!.value += t.amount;
      else incomeData[idx]!.value += t.amount;
    }
  });

  const mask = (v: string) => (hideBalance ? "R$ ***" : v);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Dashboard" />

      <main className="flex-1 overflow-auto p-3 md:p-5 grid grid-cols-1 lg:grid-cols-3 gap-4 content-start min-w-0">
        {/* Row 1 */}

        {/* Card: Entradas/Saidas + Limite Diario */}
        <Card className="flex flex-col gap-4">
          <div>
            <p className="text-[#9ca3af] text-xs mb-2">Total de Entradas esse Mês</p>
            <div className="inline-flex items-center gap-1.5 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full px-3 py-1">
              <TrendingUp size={12} className="text-[#22c55e]" />
              <span className="text-[#22c55e] text-sm font-semibold">
                {mask(formatCurrency(totalIncome))}
              </span>
            </div>
          </div>
          <div>
            <p className="text-[#9ca3af] text-xs mb-2">Total de Saídas esse Mês</p>
            <div className="inline-flex items-center gap-1.5 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-full px-3 py-1">
              <TrendingDown size={12} className="text-[#ef4444]" />
              <span className="text-[#ef4444] text-sm font-semibold">
                {mask(formatCurrency(totalExpense))}
              </span>
            </div>
          </div>

          <div>
            <p className="text-[#9ca3af] text-xs mb-2">Meta Mensal da Família</p>
            <div className="flex justify-center">
              <ProgressRing
                value={totalExpense}
                max={monthlyFamilyLimit}
                size={100}
                strokeWidth={7}
                label={mask(`${formatCurrency(totalExpense)} / ${formatCurrency(monthlyFamilyLimit)}`)}
                sublabel={`${monthlyExpenseProgress}%`}
              />
            </div>
          </div>
        </Card>

        {/* Card: Gráfico Despesas/Ganhos */}
        <Card className="flex flex-col" style={{ minHeight: 220 }}>
          <div className="flex-1 min-h-0">
            <FinanceLineChart expenseData={expenseData} incomeData={incomeData} />
          </div>
        </Card>

        {/* Card: Visualização de Gastos */}
        <Card gradient>
          <p className="text-xs text-[#9ca3af] mb-3">Visualização de Gastos</p>
          <SpendingDonutChart
            data={categoryBreakdown}
            totalValue={totalExpense}
          />
        </Card>

        {/* Row 2 */}

        {/* Card: Investimentos */}
        <Card className="lg:col-span-2 min-w-0 overflow-hidden">
          <p className="text-xs text-[#9ca3af] mb-3">Investimentos</p>
          {investments.length === 0 ? (
            <p className="text-[#9ca3af] text-sm text-center py-4">
              Nenhum investimento cadastrado
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 min-w-0">
              {investments.slice(0, 4).map((inv) => (
                <div
                  key={inv._id}
                  className="shrink-0 w-32 bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl p-3"
                >
                  <p className="text-white text-sm font-bold">{inv.ticker}</p>
                  <p className="text-[#9ca3af] text-xs mt-0.5">{inv.name.slice(0, 18)}</p>
                  <p className="text-white text-xs mt-2">
                    {mask(formatCurrency(inv.averagePrice * inv.quantity))}
                  </p>
                  {inv.changePercent !== undefined && (
                    <p
                      className={`text-xs mt-1 font-semibold ${
                        inv.changePercent >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
                      }`}
                    >
                      {inv.changePercent >= 0 ? "+" : ""}
                      {inv.changePercent.toFixed(2)}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          <ProgressBar
            value={investments.reduce((s, i) => s + i.averagePrice * i.quantity, 0)}
            max={4000}
            className="mt-3"
            showValues
            formatValue={(v) => (hideBalance ? "R$ ***" : formatCurrency(v))}
          />
        </Card>

        {/* Card: Atalhos */}
        <Card className="min-w-0">
          <p className="text-xs text-[#9ca3af] mb-3">Atalhos</p>
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/movimentacoes"
              className="w-12 h-12 bg-[#00d4aa]/10 border border-[#00d4aa]/20 rounded-xl flex items-center justify-center text-[#00d4aa] hover:bg-[#00d4aa]/20 transition-colors"
              title="Nova Movimentação"
            >
              <Plus size={20} />
            </Link>
            <Link
              href="/movimentacoes"
              className="w-12 h-12 bg-[#00d4aa]/10 border border-[#00d4aa]/20 rounded-xl flex items-center justify-center text-[#00d4aa] hover:bg-[#00d4aa]/20 transition-colors"
              title="Movimentações"
            >
              <FileText size={20} />
            </Link>
            <Link
              href="/investimentos"
              className="w-12 h-12 bg-[#00d4aa]/10 border border-[#00d4aa]/20 rounded-xl flex items-center justify-center text-[#00d4aa] hover:bg-[#00d4aa]/20 transition-colors"
              title="Investimentos"
            >
              <BarChart2 size={20} />
            </Link>
            <button
              className="text-[#9ca3af] text-xs flex items-center gap-1 hover:text-white transition-colors"
              title="Criar novo atalho"
            >
              <FileBarChart size={14} />
              + Criar novo
            </button>
          </div>
        </Card>
      </main>
    </div>
  );
}
