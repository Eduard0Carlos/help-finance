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
import { AddTransactionModal } from "@/components/transactions/AddTransactionModal";
import { useBalance } from "@/components/layout/BalanceContext";
import { ITransaction, ICategoryBreakdown, IChartDataPoint } from "@/types";
import {
  formatCurrency,
  formatDate,
  getMonthName,
  groupTransactionsByDay,
  getCategoryColor,
} from "@/lib/utils";
import { TrendingUp, TrendingDown, CheckCircle, Trash2, Eye, EyeOff } from "lucide-react";

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

export default function MovimentacoesPage() {
  const { hideBalance, toggleBalance } = useBalance();
  const now = new Date();
  const [selected, setSelected] = useState<Month>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [dailyLimit, setDailyLimit] = useState(350);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const months = getLast6Months();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, userRes] = await Promise.all([
        fetch(`/api/transactions?year=${selected.year}&month=${selected.month}`),
        fetch("/api/user"),
      ]);
      if (txRes.ok) setTransactions(await txRes.json());
      if (userRes.ok) {
        const u = await userRes.json();
        setDailyLimit(u.dailyLimit ?? 350);
      }
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => { load(); }, [load]);

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const daysInMonth = new Date(selected.year, selected.month + 1, 0).getDate();

  const dailyTotals: Record<string, number> = {};
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const day = new Date(t.date).toISOString().split("T")[0]!;
      dailyTotals[day] = (dailyTotals[day] ?? 0) + t.amount;
    });
  const daysWithinLimit = Object.values(dailyTotals).filter(
    (v) => v <= dailyLimit
  ).length;

  const expenseByCategory: Record<string, number> = {};
  transactions.filter((t) => t.type === "expense").forEach((t) => {
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

  const expenseData: IChartDataPoint[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(selected.year, selected.month - 11 + i, 1);
    return { label: getMonthName(d.getMonth()).slice(0, 3).toUpperCase(), value: 0 };
  });
  const incomeData: IChartDataPoint[] = expenseData.map((d) => ({ ...d }));
  transactions.forEach((t) => {
    const d = new Date(t.date);
    const idx =
      (d.getFullYear() - selected.year) * 12 +
      d.getMonth() -
      (selected.month - 11);
    if (idx >= 0 && idx < 12) {
      if (t.type === "expense") expenseData[idx]!.value += t.amount;
      else incomeData[idx]!.value += t.amount;
    }
  });

  const grouped = groupTransactionsByDay(transactions);
  const mask = (v: string) => (hideBalance ? "R$ ***" : v);

  async function deleteTransaction(id: string) {
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    setTransactions((prev) => prev.filter((t) => t._id !== id));
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Movimentações" />

      <main className="flex-1 overflow-auto p-5 grid grid-cols-3 gap-4 content-start">
        {/* Column 1 */}
        <div className="flex flex-col gap-4">
          {/* Saldo */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#9ca3af]">Saldo</p>
              <button onClick={toggleBalance} className="text-[#9ca3af] hover:text-white transition-colors">
                {hideBalance ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-white text-sm font-semibold mb-3">
              {hideBalance ? "R$ ***********" : formatCurrency(balance)}
            </p>
            <p className="text-xs text-[#9ca3af] mb-1">Limite Diário</p>
            <ProgressBar
              value={dailyLimit * 0.67}
              max={dailyLimit}
              showValues
              formatValue={(v) => mask(formatCurrency(v))}
            />
          </Card>

          {/* Month selector */}
          <Card>
            <p className="text-xs text-[#9ca3af] mb-3">Meses</p>
            <MonthSelector months={months} selected={selected} onSelect={setSelected} />
          </Card>
        </div>

        {/* Column 2 - Movimentações */}
        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#9ca3af]">Movimentações</p>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[#9ca3af] text-sm">Nenhuma movimentação</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
              {grouped.map(({ date, items }) => (
                <div key={date}>
                  <p className="text-xs text-[#9ca3af] mb-2">
                    Dia {new Date(date + "T12:00:00").getDate()}
                  </p>
                  <div className="flex flex-col gap-2">
                    {items.map((tx) => (
                      <div
                        key={tx._id}
                        className="flex items-center justify-between py-2 border-b border-[#1e1e2e] last:border-0 group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: getCategoryColor(tx.category) }}
                          />
                          <div className="min-w-0">
                            <p className="text-white text-xs font-medium truncate">
                              {tx.description}
                            </p>
                            <p className="text-[#9ca3af] text-[10px]">{formatDate(tx.date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs font-semibold ${
                              tx.type === "income" ? "text-[#22c55e]" : "text-[#ef4444]"
                            }`}
                          >
                            {tx.type === "income" ? "+" : "-"}
                            {mask(formatCurrency(tx.amount))}
                          </span>
                          <button
                            onClick={() => deleteTransaction(tx._id)}
                            className="text-[#9ca3af] hover:text-[#ef4444] transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
          {/* Resumo Período */}
          <Card>
            <p className="text-xs text-[#9ca3af] mb-3">Resumo Período</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-[#9ca3af] mb-1">Total de Entradas</p>
                <div className="flex items-center gap-1 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full px-2 py-1">
                  <TrendingUp size={10} className="text-[#22c55e]" />
                  <span className="text-[#22c55e] text-xs">{mask(formatCurrency(totalIncome))}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-[#9ca3af] mb-1">Dias dentro do Limite</p>
                <div className="flex items-center gap-1 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full px-2 py-1">
                  <CheckCircle size={10} className="text-[#22c55e]" />
                  <span className="text-[#22c55e] text-xs">
                    {daysWithinLimit}/{daysInMonth} dias
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-[#9ca3af] mb-1">Total de Saídas</p>
                <div className="flex items-center gap-1 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-full px-2 py-1">
                  <TrendingDown size={10} className="text-[#ef4444]" />
                  <span className="text-[#ef4444] text-xs">{mask(formatCurrency(totalExpense))}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-[#9ca3af] mb-1">Saldo</p>
                <div className={`flex items-center gap-1 rounded-full px-2 py-1 ${balance >= 0 ? "bg-[#22c55e]/10 border border-[#22c55e]/20" : "bg-[#ef4444]/10 border border-[#ef4444]/20"}`}>
                  {balance >= 0 ? (
                    <TrendingUp size={10} className="text-[#22c55e]" />
                  ) : (
                    <TrendingDown size={10} className="text-[#ef4444]" />
                  )}
                  <span className={`text-xs ${balance >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                    {mask(formatCurrency(balance))}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Donut */}
          <Card gradient style={{ minHeight: 150 }}>
            <p className="text-xs text-[#9ca3af] mb-2">Visualização de Gastos</p>
            <SpendingDonutChart data={categoryBreakdown} totalValue={totalExpense} />
          </Card>

          {/* Line Chart */}
          <Card className="flex flex-col" style={{ minHeight: 160 }}>
            <div className="flex-1 min-h-0">
              <FinanceLineChart expenseData={expenseData} incomeData={incomeData} />
            </div>
          </Card>
        </div>
      </main>

      <AddTransactionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}
