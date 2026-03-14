"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { Modal } from "@/components/ui/Modal";
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
import {
  ITransaction,
  ICategoryBreakdown,
  IChartDataPoint,
  IMonthReference,
  IFinancialSheetRow,
} from "@/types";
import {
  formatCurrency,
  getMonthName,
  groupTransactionsByDay,
  getCategoryColor,
} from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { performMutationWithOfflineQueue } from "@/lib/offlineQueue";
import { toDateKey } from "@/lib/recurrence";

const AJUSTE_PREFIX = "Ajuste planilha:";

function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function buildRollingMonths(endYear: number, endMonth: number, count = 6): IMonthReference[] {
  const result: IMonthReference[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(endYear, endMonth - i, 1);
    result.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      key: toMonthKey(d.getFullYear(), d.getMonth()),
      label: `${getMonthName(d.getMonth()).slice(0, 3).toUpperCase()}/${String(d.getFullYear()).slice(-2)}`,
    });
  }
  return result;
}

function isAdjustmentTransaction(tx: ITransaction, category?: string) {
  const isAdjustment = tx.description.startsWith(AJUSTE_PREFIX);
  if (!isAdjustment) return false;
  if (!category) return true;
  return tx.category === category;
}

export default function MovimentacoesPage() {
  const { hideBalance, toggleBalance } = useBalance();
  const now = new Date();
  const [selected, setSelected] = useState<{ year: number; month: number }>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [monthlyTransactions, setMonthlyTransactions] = useState<Record<string, ITransaction[]>>(
    {}
  );
  const [dailyLimit, setDailyLimit] = useState(350);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "sheet">("list");
  const [editingCell, setEditingCell] = useState<{
    rowKey: string;
    monthKey: string;
    value: string;
  } | null>(null);
  const [savingCell, setSavingCell] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteRecurringTarget, setDeleteRecurringTarget] = useState<ITransaction | null>(null);

  const sheetMonths = useMemo(
    () => buildRollingMonths(selected.year, selected.month, 6),
    [selected]
  );
  const monthOptions = useMemo(
    () => sheetMonths.map((month) => ({ year: month.year, month: month.month })),
    [sheetMonths]
  );
  const selectedMonthKey = toMonthKey(selected.year, selected.month);
  const transactions = monthlyTransactions[selectedMonthKey] ?? [];
  const windowLabel = `${sheetMonths[0]?.label ?? ""} - ${sheetMonths[sheetMonths.length - 1]?.label ?? ""}`;

  function shiftSelectedMonth(offset: number) {
    setSelected((prev) => {
      const nextDate = new Date(prev.year, prev.month + offset, 1);
      return { year: nextDate.getFullYear(), month: nextDate.getMonth() };
    });
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [monthsData, userRes] = await Promise.all([
        Promise.all(
          sheetMonths.map(async (monthRef) => {
            const txRes = await fetch(
              `/api/transactions?year=${monthRef.year}&month=${monthRef.month}`
            );
            if (!txRes.ok) return [monthRef.key, []] as const;
            const data = (await txRes.json()) as ITransaction[];
            return [monthRef.key, data] as const;
          })
        ),
        fetch("/api/user"),
      ]);

      setMonthlyTransactions(Object.fromEntries(monthsData));

      if (userRes.ok) {
        const u = await userRes.json();
        setDailyLimit(u.dailyLimit ?? 350);
      }
    } finally {
      setLoading(false);
    }
  }, [sheetMonths]);

  useEffect(() => {
    void load();
  }, [load]);

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
  sheetMonths.forEach((monthRef) => {
    const monthTx = monthlyTransactions[monthRef.key] ?? [];
    const idx =
      (monthRef.year - selected.year) * 12 + monthRef.month - (selected.month - 11);
    if (idx >= 0 && idx < 12) {
      expenseData[idx]!.value = monthTx
        .filter((t) => t.type === "expense")
        .reduce((sum, tx) => sum + tx.amount, 0);
      incomeData[idx]!.value = monthTx
        .filter((t) => t.type === "income")
        .reduce((sum, tx) => sum + tx.amount, 0);
    }
  });

  const grouped = groupTransactionsByDay(transactions);
  const mask = (v: string) => (hideBalance ? "R$ ***" : v);
  const periodIncomeTotal = sheetMonths.reduce((sum, month) => {
    const monthTx = monthlyTransactions[month.key] ?? [];
    return sum + monthTx.filter((tx) => tx.type === "income").reduce((acc, tx) => acc + tx.amount, 0);
  }, 0);
  const periodExpenseTotal = sheetMonths.reduce((sum, month) => {
    const monthTx = monthlyTransactions[month.key] ?? [];
    return sum + monthTx.filter((tx) => tx.type === "expense").reduce((acc, tx) => acc + tx.amount, 0);
  }, 0);
  const periodNetTotal = periodIncomeTotal - periodExpenseTotal;

  const sheetRows = useMemo<IFinancialSheetRow[]>(() => {
    const valuesByMonthIncome: Record<string, number> = {};
    const valuesByMonthExpense: Record<string, number> = {};
    const valuesByMonthBalance: Record<string, number> = {};

    const categorySet = new Set<string>();
    for (const monthRef of sheetMonths) {
      const monthTx = monthlyTransactions[monthRef.key] ?? [];
      for (const tx of monthTx) {
        categorySet.add(tx.category);
      }
      const income = monthTx
        .filter((tx) => tx.type === "income")
        .reduce((sum, tx) => sum + tx.amount, 0);
      const expense = monthTx
        .filter((tx) => tx.type === "expense")
        .reduce((sum, tx) => sum + tx.amount, 0);
      valuesByMonthIncome[monthRef.key] = income;
      valuesByMonthExpense[monthRef.key] = expense;
      valuesByMonthBalance[monthRef.key] = income - expense;
    }

    const categories = [...categorySet].sort((a, b) => a.localeCompare(b));
    const categoryRows: IFinancialSheetRow[] = categories.map((category) => {
      const valuesByMonth: Record<string, number> = {};
      for (const monthRef of sheetMonths) {
        const monthTx = monthlyTransactions[monthRef.key] ?? [];
        valuesByMonth[monthRef.key] = monthTx
          .filter((tx) => tx.category === category)
          .reduce((sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount), 0);
      }
      return {
        key: `category:${category}`,
        title: category,
        rowType: "category",
        valuesByMonth,
      };
    });

    return [
      {
        key: "summary:income",
        title: "Receitas",
        rowType: "summary",
        valuesByMonth: valuesByMonthIncome,
      },
      {
        key: "summary:expense",
        title: "Despesas",
        rowType: "summary",
        valuesByMonth: valuesByMonthExpense,
      },
      {
        key: "summary:balance",
        title: "Saldo",
        rowType: "summary",
        valuesByMonth: valuesByMonthBalance,
      },
      ...categoryRows,
    ];
  }, [sheetMonths, monthlyTransactions]);

  async function deleteTransaction(
    tx: ITransaction,
    recurringMode?: "occurrence" | "series"
  ) {
    setDeleteError(null);

    if (tx.isRecurring && !recurringMode) {
      setDeleteRecurringTarget(tx);
      return;
    }

    setDeleting(true);
    try {
      let result: { ok: boolean; queued?: boolean };

      if (tx.isRecurring) {
        if (!tx.recurringTemplateId) {
          setDeleteError("Não foi possível identificar o template da recorrência.");
          return;
        }
        const mode = recurringMode ?? "occurrence";
        const query =
          mode === "series"
            ? "mode=series"
            : `mode=occurrence&dateKey=${toDateKey(new Date(tx.date))}`;

        result = await performMutationWithOfflineQueue({
          url: `/api/recurring-transactions/${tx.recurringTemplateId}?${query}`,
          method: "DELETE",
        });
      } else {
        result = await performMutationWithOfflineQueue({
          url: `/api/transactions/${tx._id}`,
          method: "DELETE",
        });
      }

      if (!result.ok) {
        setDeleteError("Não foi possível excluir a movimentação.");
        return;
      }

      setMonthlyTransactions((prev) => ({
        ...prev,
        [selectedMonthKey]: (prev[selectedMonthKey] ?? []).filter((item) =>
          tx.isRecurring && recurringMode === "series"
            ? item.recurringTemplateId !== tx.recurringTemplateId
            : item._id !== tx._id
        ),
      }));
      setDeleteRecurringTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  function startCellEdit(row: IFinancialSheetRow, monthKey: string) {
    if (row.rowType !== "category") return;
    setRowError(null);
    setEditingCell({
      rowKey: row.key,
      monthKey,
      value: String(row.valuesByMonth[monthKey] ?? 0),
    });
  }

  function cancelCellEdit() {
    setEditingCell(null);
    setRowError(null);
  }

  async function saveCellEdit() {
    if (!editingCell) return;
    const { rowKey, monthKey, value } = editingCell;
    const row = sheetRows.find((item) => item.key === rowKey);
    if (!row || row.rowType !== "category") return;

    const targetValue = Number(value);
    if (!Number.isFinite(targetValue)) {
      setRowError("Valor inválido.");
      return;
    }

    const category = row.title;
    const monthTx = monthlyTransactions[monthKey] ?? [];
    const baseNet = monthTx
      .filter((tx) => tx.category === category && !isAdjustmentTransaction(tx, category))
      .reduce((sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount), 0);

    const desiredAdjustment = targetValue - baseNet;
    const existingIncomeAdjustment = monthTx.find(
      (tx) => tx.type === "income" && isAdjustmentTransaction(tx, category)
    );
    const existingExpenseAdjustment = monthTx.find(
      (tx) => tx.type === "expense" && isAdjustmentTransaction(tx, category)
    );

    const monthRef = sheetMonths.find((m) => m.key === monthKey);
    if (!monthRef) {
      setRowError("Mês inválido para edição.");
      return;
    }
    const date = `${monthRef.year}-${String(monthRef.month + 1).padStart(2, "0")}-01`;

    setSavingCell(true);
    setRowError(null);
    try {
      let queuedAny = false;

      if (desiredAdjustment > 0.0001) {
        const result = existingIncomeAdjustment
          ? await performMutationWithOfflineQueue({
              url: `/api/transactions/${existingIncomeAdjustment._id}`,
              method: "PATCH",
              body: { amount: Number(desiredAdjustment.toFixed(2)) },
            })
          : await performMutationWithOfflineQueue({
              url: "/api/transactions",
              method: "POST",
              body: {
                type: "income",
                amount: Number(desiredAdjustment.toFixed(2)),
                category,
                description: `${AJUSTE_PREFIX} ${category}`,
                date,
              },
            });
        if (!result.ok) {
          setRowError("Não foi possível salvar o ajuste.");
          return;
        }
        queuedAny = queuedAny || result.queued;

        if (existingExpenseAdjustment) {
          const deleteResult = await performMutationWithOfflineQueue({
            url: `/api/transactions/${existingExpenseAdjustment._id}`,
            method: "DELETE",
          });
          if (!deleteResult.ok) {
            setRowError("Não foi possível remover ajuste antigo.");
            return;
          }
          queuedAny = queuedAny || deleteResult.queued;
        }
      } else if (desiredAdjustment < -0.0001) {
        const expenseAmount = Number(Math.abs(desiredAdjustment).toFixed(2));
        const result = existingExpenseAdjustment
          ? await performMutationWithOfflineQueue({
              url: `/api/transactions/${existingExpenseAdjustment._id}`,
              method: "PATCH",
              body: { amount: expenseAmount },
            })
          : await performMutationWithOfflineQueue({
              url: "/api/transactions",
              method: "POST",
              body: {
                type: "expense",
                amount: expenseAmount,
                category,
                description: `${AJUSTE_PREFIX} ${category}`,
                date,
              },
            });
        if (!result.ok) {
          setRowError("Não foi possível salvar o ajuste.");
          return;
        }
        queuedAny = queuedAny || result.queued;

        if (existingIncomeAdjustment) {
          const deleteResult = await performMutationWithOfflineQueue({
            url: `/api/transactions/${existingIncomeAdjustment._id}`,
            method: "DELETE",
          });
          if (!deleteResult.ok) {
            setRowError("Não foi possível remover ajuste antigo.");
            return;
          }
          queuedAny = queuedAny || deleteResult.queued;
        }
      } else {
        if (existingIncomeAdjustment) {
          const deleteResult = await performMutationWithOfflineQueue({
            url: `/api/transactions/${existingIncomeAdjustment._id}`,
            method: "DELETE",
          });
          if (!deleteResult.ok) {
            setRowError("Não foi possível remover ajuste.");
            return;
          }
          queuedAny = queuedAny || deleteResult.queued;
        }
        if (existingExpenseAdjustment) {
          const deleteResult = await performMutationWithOfflineQueue({
            url: `/api/transactions/${existingExpenseAdjustment._id}`,
            method: "DELETE",
          });
          if (!deleteResult.ok) {
            setRowError("Não foi possível remover ajuste.");
            return;
          }
          queuedAny = queuedAny || deleteResult.queued;
        }
      }

      if (queuedAny) {
        setMonthlyTransactions((prev) => {
          const currentMonthTransactions = prev[monthKey] ?? [];
          const withoutAdjustments = currentMonthTransactions.filter(
            (tx) => !(tx.category === category && isAdjustmentTransaction(tx, category))
          );
          const updatedMonthTransactions = [...withoutAdjustments];
          if (desiredAdjustment > 0.0001) {
            updatedMonthTransactions.push({
              _id: existingIncomeAdjustment?._id ?? `local-adjust-${Date.now()}`,
              userId: currentMonthTransactions[0]?.userId ?? "",
              type: "income",
              amount: Number(desiredAdjustment.toFixed(2)),
              category,
              description: `${AJUSTE_PREFIX} ${category}`,
              date: new Date(monthRef.year, monthRef.month, 1).toISOString(),
              createdAt: new Date().toISOString(),
              isRecurring: false,
            });
          } else if (desiredAdjustment < -0.0001) {
            updatedMonthTransactions.push({
              _id: existingExpenseAdjustment?._id ?? `local-adjust-${Date.now()}`,
              userId: currentMonthTransactions[0]?.userId ?? "",
              type: "expense",
              amount: Number(Math.abs(desiredAdjustment).toFixed(2)),
              category,
              description: `${AJUSTE_PREFIX} ${category}`,
              date: new Date(monthRef.year, monthRef.month, 1).toISOString(),
              createdAt: new Date().toISOString(),
              isRecurring: false,
            });
          }
          return { ...prev, [monthKey]: updatedMonthTransactions };
        });
      } else {
        await load();
      }

      setEditingCell(null);
    } finally {
      setSavingCell(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Movimentações" />

      <main className="flex-1 overflow-hidden p-3 md:p-5 min-w-0 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-[#2a2a3e] p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-[#00d4aa]/15 text-[#00d4aa]"
                  : "text-[#9ca3af] hover:text-white"
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode("sheet")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                viewMode === "sheet"
                  ? "bg-[#00d4aa]/15 text-[#00d4aa]"
                  : "text-[#9ca3af] hover:text-white"
              }`}
            >
              Planilha
            </button>
          </div>
        </div>

        {viewMode === "list" ? (
          <div className="flex-1 overflow-auto grid grid-cols-1 lg:grid-cols-3 gap-4 content-start min-w-0 pr-1">
            <div className="flex flex-col gap-4 min-w-0">
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-[#9ca3af]">Saldo</p>
                  <button
                    onClick={toggleBalance}
                    className="text-[#9ca3af] hover:text-white transition-colors"
                  >
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
              <Card>
                <p className="text-xs text-[#9ca3af] mb-3">Meses</p>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <button
                    onClick={() => shiftSelectedMonth(-1)}
                    className="h-8 w-8 rounded-lg border border-[#2a2a3e] text-[#9ca3af] hover:text-white hover:border-[#3a3a52] inline-flex items-center justify-center"
                    title="Mês anterior"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[11px] text-[#9ca3af] truncate">{windowLabel}</span>
                  <button
                    onClick={() => shiftSelectedMonth(1)}
                    className="h-8 w-8 rounded-lg border border-[#2a2a3e] text-[#9ca3af] hover:text-white hover:border-[#3a3a52] inline-flex items-center justify-center"
                    title="Próximo mês"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <MonthSelector months={monthOptions} selected={selected} onSelect={setSelected} />
              </Card>
            </div>

            <Card className="flex flex-col overflow-hidden min-w-0">
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
                                <div className="flex items-center gap-1.5">
                                  <p className="text-[#9ca3af] text-[10px]">
                                    {new Date(tx.date).toLocaleDateString("pt-BR")}
                                  </p>
                                  {tx.isRecurring && (
                                    <span className="text-[10px] text-[#00d4aa] border border-[#00d4aa]/30 px-1 py-0.5 rounded">
                                      recorrente
                                    </span>
                                  )}
                                </div>
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
                                onClick={() => void deleteTransaction(tx)}
                                className="text-[#9ca3af] hover:text-[#ef4444] transition-colors opacity-0 group-hover:opacity-100"
                                title={tx.isRecurring ? "Excluir recorrência" : "Excluir movimentação"}
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
              {deleteError && <p className="mt-2 text-[11px] text-[#ef4444]">{deleteError}</p>}
            </Card>

            <div className="flex flex-col gap-4 min-w-0">
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
                    <div
                      className={`flex items-center gap-1 rounded-full px-2 py-1 ${
                        balance >= 0
                          ? "bg-[#22c55e]/10 border border-[#22c55e]/20"
                          : "bg-[#ef4444]/10 border border-[#ef4444]/20"
                      }`}
                    >
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
              <Card gradient style={{ minHeight: 150 }}>
                <p className="text-xs text-[#9ca3af] mb-2">Visualização de Gastos</p>
                <SpendingDonutChart data={categoryBreakdown} totalValue={totalExpense} />
              </Card>
              <Card className="flex flex-col" style={{ minHeight: 160 }}>
                <div className="flex-1 min-h-0">
                  <FinanceLineChart expenseData={expenseData} incomeData={incomeData} />
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="flex-1 min-h-0 overflow-hidden min-w-0 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => shiftSelectedMonth(-1)}
                  className="h-8 w-8 rounded-lg border border-[#2a2a3e] text-[#9ca3af] hover:text-white hover:border-[#3a3a52] inline-flex items-center justify-center shrink-0"
                  title="Janela anterior"
                >
                  <ChevronLeft size={14} />
                </button>
                <p className="text-xs text-[#9ca3af] truncate">
                  Planilha financeira mensal ({windowLabel})
                </p>
                <button
                  onClick={() => shiftSelectedMonth(1)}
                  className="h-8 w-8 rounded-lg border border-[#2a2a3e] text-[#9ca3af] hover:text-white hover:border-[#3a3a52] inline-flex items-center justify-center shrink-0"
                  title="Próxima janela"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              <button
                onClick={() => setAddOpen(true)}
                className="h-8 px-3 rounded-lg bg-[#2a2a3e] hover:bg-[#3a3a5e] text-white text-xs transition-colors shrink-0"
              >
                Adicionar lançamento
              </button>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : sheetRows.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[#9ca3af] text-sm">Sem dados para a planilha</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto border border-[#1e1e2e] rounded-lg">
                <table className="w-full min-w-[920px] text-xs border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-[#101018]">
                      <th className="sticky top-0 left-0 z-20 text-left py-2 px-3 font-medium text-[#9ca3af] border-b border-r border-[#1e1e2e] bg-[#101018] min-w-[220px]">
                        Item
                      </th>
                      {sheetMonths.map((month) => (
                        <th
                          key={month.key}
                          className="sticky top-0 z-10 text-right py-2 px-3 font-medium text-[#9ca3af] border-b border-[#1e1e2e] bg-[#101018] min-w-[130px]"
                        >
                          {month.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheetRows.map((row, rowIndex) => (
                      <tr
                        key={row.key}
                        className={rowIndex % 2 === 0 ? "bg-transparent" : "bg-[#101018]/40"}
                      >
                        <td
                          className={`sticky left-0 z-10 py-2 px-3 border-r border-b border-[#1e1e2e] ${
                            row.rowType === "summary"
                              ? "text-white font-semibold bg-[#141420]"
                              : "text-[#d1d5db] bg-[#141420]"
                          }`}
                        >
                          {row.title}
                        </td>
                        {sheetMonths.map((month) => {
                          const cellValue = row.valuesByMonth[month.key] ?? 0;
                          const isEditing =
                            editingCell?.rowKey === row.key && editingCell?.monthKey === month.key;
                          return (
                            <td
                              key={`${row.key}-${month.key}`}
                              className="py-1.5 px-2 border-b border-[#1e1e2e] text-right"
                            >
                              {isEditing ? (
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editingCell?.value ?? ""}
                                    onChange={(e) =>
                                      setEditingCell((prev) =>
                                        prev ? { ...prev, value: e.target.value } : prev
                                      )
                                    }
                                    className="w-[110px] h-8 rounded border border-[#2a2a3e] bg-[#0d0d0d] px-2 text-xs text-right text-white"
                                  />
                                  <button
                                    onClick={saveCellEdit}
                                    disabled={savingCell}
                                    className="h-8 w-8 inline-flex items-center justify-center rounded text-[#22c55e] hover:bg-[#22c55e]/10 disabled:opacity-60"
                                    title="Salvar célula"
                                  >
                                    <Save size={13} />
                                  </button>
                                  <button
                                    onClick={cancelCellEdit}
                                    disabled={savingCell}
                                    className="h-8 w-8 inline-flex items-center justify-center rounded text-[#9ca3af] hover:bg-[#2a2a3e] disabled:opacity-60"
                                    title="Cancelar"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  disabled={row.rowType === "summary"}
                                  onClick={() => startCellEdit(row, month.key)}
                                  className={`w-full text-right rounded px-1 py-1 ${
                                    row.rowType === "summary"
                                      ? "cursor-default"
                                      : "hover:bg-[#2a2a3e] transition-colors"
                                  } ${
                                    cellValue >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
                                  }`}
                                >
                                  {mask(formatCurrency(cellValue))}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#0f1220]">
                      <td className="sticky left-0 z-10 py-2 px-3 border-r border-t border-[#1e1e2e] text-white font-semibold bg-[#0f1220]">
                        Total ganho - gasto
                      </td>
                      {sheetMonths.map((month, index) => (
                        <td
                          key={`period-total-${month.key}`}
                          className="py-2 px-2 border-t border-[#1e1e2e] text-right font-semibold"
                        >
                          {index === sheetMonths.length - 1 ? (
                            <span className={periodNetTotal >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}>
                              {mask(formatCurrency(periodNetTotal))}
                            </span>
                          ) : (
                            <span className="text-[#6b7280]">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {rowError && <p className="mt-2 text-[11px] text-[#ef4444]">{rowError}</p>}
          </Card>
        )}
      </main>

      <AddTransactionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={load}
      />
      <Modal
        open={Boolean(deleteRecurringTarget)}
        onClose={() => {
          if (!deleting) setDeleteRecurringTarget(null);
        }}
        title="Excluir movimentação recorrente"
      >
        <p className="text-sm text-[#d1d5db] mb-4">
          Escolha se deseja remover apenas esta ocorrência ou toda a série recorrente.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() =>
              deleteRecurringTarget
                ? void deleteTransaction(deleteRecurringTarget, "occurrence")
                : undefined
            }
            disabled={deleting}
            className="w-full h-10 rounded-lg border border-[#2a2a3e] text-white hover:border-[#3a3a52] hover:bg-[#1a1a28] disabled:opacity-60"
          >
            Excluir esta ocorrência
          </button>
          <button
            onClick={() =>
              deleteRecurringTarget
                ? void deleteTransaction(deleteRecurringTarget, "series")
                : undefined
            }
            disabled={deleting}
            className="w-full h-10 rounded-lg bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#fecaca] hover:bg-[#ef4444]/30 disabled:opacity-60"
          >
            Excluir série inteira
          </button>
          <button
            onClick={() => setDeleteRecurringTarget(null)}
            disabled={deleting}
            className="w-full h-10 rounded-lg text-[#9ca3af] hover:text-white disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
}
