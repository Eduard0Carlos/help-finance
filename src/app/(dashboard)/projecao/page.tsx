"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { useBalance } from "@/components/layout/BalanceContext";
import { formatCurrency } from "@/lib/utils";
import { IChartDataPoint, IProjectionResponse } from "@/types";

const FinanceLineChart = dynamic(
  () => import("@/components/charts/FinanceLineChart").then((m) => m.FinanceLineChart),
  { ssr: false }
);

function clampMonthsRange(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(120, Math.max(0, Math.floor(value)));
}

export default function ProjectionPage() {
  const { hideBalance } = useBalance();
  const [monthsBack, setMonthsBack] = useState(0);
  const [monthsForward, setMonthsForward] = useState(6);
  const [initialBalanceInput, setInitialBalanceInput] = useState("");
  const [isInitialDirty, setIsInitialDirty] = useState(false);
  const [data, setData] = useState<IProjectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjection = useCallback(
    async (
      targetMonthsBack: number,
      targetMonthsForward: number,
      customInitialBalance?: string
    ) => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams();
        query.set("monthsBack", String(clampMonthsRange(targetMonthsBack)));
        query.set("monthsForward", String(clampMonthsRange(targetMonthsForward)));
        if (customInitialBalance !== undefined && customInitialBalance.trim() !== "") {
          query.set("initialBalance", customInitialBalance.trim());
        }

        const res = await fetch(`/api/projecao?${query.toString()}`);
        if (!res.ok) throw new Error("Falha ao carregar projeção financeira.");

        const payload = (await res.json()) as IProjectionResponse;
        setData(payload);
        if (customInitialBalance === undefined) {
          setInitialBalanceInput(String(payload.initialBalance));
        }
      } catch {
        setError("Não foi possível carregar a projeção. Tente novamente.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchProjection(0, 6);
  }, [fetchProjection]);

  const expenseData: IChartDataPoint[] = useMemo(
    () => (data?.rows ?? []).map((row) => ({ label: row.label, value: row.expense })),
    [data]
  );
  const incomeData: IChartDataPoint[] = useMemo(
    () => (data?.rows ?? []).map((row) => ({ label: row.label, value: row.income })),
    [data]
  );

  const formatMoney = (value: number) => (hideBalance ? "R$ ***" : formatCurrency(value));

  async function applyFilters() {
    const targetBack = clampMonthsRange(monthsBack);
    const targetForward = clampMonthsRange(monthsForward);
    setMonthsBack(targetBack);
    setMonthsForward(targetForward);
    await fetchProjection(targetBack, targetForward, initialBalanceInput);
  }

  async function resetToAutomaticBalance() {
    setIsInitialDirty(false);
    await fetchProjection(monthsBack, monthsForward);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Projeção" />

      <main className="flex-1 overflow-auto p-3 md:p-5 grid grid-cols-1 gap-4 content-start min-w-0">
        <Card className="flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-[170px_170px_220px_auto] gap-3 items-end min-w-0">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-[#9ca3af]">Meses para trás</span>
              <input
                type="number"
                min={0}
                max={120}
                value={monthsBack}
                onChange={(e) => setMonthsBack(clampMonthsRange(Number(e.target.value)))}
                className="h-10 rounded-lg border border-[#2a2a3e] bg-[#0d0d0d] px-3 text-sm text-white outline-none focus:border-[#00d4aa]"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-[#9ca3af]">Meses para frente</span>
              <input
                type="number"
                min={0}
                max={120}
                value={monthsForward}
                onChange={(e) => setMonthsForward(clampMonthsRange(Number(e.target.value)))}
                className="h-10 rounded-lg border border-[#2a2a3e] bg-[#0d0d0d] px-3 text-sm text-white outline-none focus:border-[#00d4aa]"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-[#9ca3af]">Saldo inicial (R$)</span>
              <input
                type="number"
                step="0.01"
                value={initialBalanceInput}
                onChange={(e) => {
                  setInitialBalanceInput(e.target.value);
                  setIsInitialDirty(true);
                }}
                className="h-10 rounded-lg border border-[#2a2a3e] bg-[#0d0d0d] px-3 text-sm text-white outline-none focus:border-[#00d4aa]"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={applyFilters}
                className="h-10 px-4 rounded-lg bg-[#00d4aa] text-[#0b0b12] text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Aplicar
              </button>
              <button
                onClick={resetToAutomaticBalance}
                className="h-10 px-4 rounded-lg border border-[#2a2a3e] text-[#9ca3af] text-sm hover:text-white hover:border-[#3a3a52] transition-colors"
              >
                Usar saldo automático
              </button>
            </div>
          </div>
          {data && (
            <p className="text-xs text-[#9ca3af]">
              Saldo automático atual: {formatMoney(data.automaticInitialBalance)}
              {isInitialDirty ? " (ajuste manual ativo)" : ""}
              {` | Faixa: ${data.monthsBack} mês(es) para trás até ${data.monthsForward} para frente`}
              {data.includesOneTimeTransactions ? " | Base: recorrentes + lançamentos comuns" : ""}
            </p>
          )}
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <Card>
            <p className="text-sm text-[#ef4444]">{error}</p>
          </Card>
        ) : !data || data.rows.length === 0 ? (
          <Card>
            <p className="text-sm text-[#9ca3af]">
              Nenhum lançamento encontrado para a faixa selecionada.
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <p className="text-xs text-[#9ca3af] mb-1">Receitas projetadas</p>
                <p className="text-xl font-semibold text-[#22c55e]">
                  {formatMoney(data.summary.totalIncome)}
                </p>
              </Card>
              <Card>
                <p className="text-xs text-[#9ca3af] mb-1">Despesas projetadas</p>
                <p className="text-xl font-semibold text-[#ef4444]">
                  {formatMoney(data.summary.totalExpense)}
                </p>
              </Card>
              <Card>
                <p className="text-xs text-[#9ca3af] mb-1">Saldo final projetado</p>
                <p
                  className={`text-xl font-semibold ${
                    data.summary.projectedFinalBalance >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
                  }`}
                >
                  {formatMoney(data.summary.projectedFinalBalance)}
                </p>
              </Card>
            </div>

            <Card className="h-[280px] md:h-[320px]">
              <FinanceLineChart
                expenseData={expenseData}
                incomeData={incomeData}
                expenseLabel="Despesas projetadas"
                incomeLabel="Receitas projetadas"
                expenseColor="#ef4444"
                incomeColor="#22c55e"
              />
            </Card>

            <Card className="min-w-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="text-left text-[#9ca3af] border-b border-[#2a2a3e]">
                      <th className="py-2 pr-3 font-medium">Mês</th>
                      <th className="py-2 pr-3 font-medium">Receitas</th>
                      <th className="py-2 pr-3 font-medium">Despesas</th>
                      <th className="py-2 pr-3 font-medium">Saldo do mês</th>
                      <th className="py-2 font-medium">Saldo acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={row.monthKey} className="border-b border-[#1f1f32]">
                        <td className="py-2.5 pr-3 text-white">{row.label}</td>
                        <td className="py-2.5 pr-3 text-[#22c55e]">{formatMoney(row.income)}</td>
                        <td className="py-2.5 pr-3 text-[#ef4444]">{formatMoney(row.expense)}</td>
                        <td
                          className={`py-2.5 pr-3 ${
                            row.monthBalance >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
                          }`}
                        >
                          {formatMoney(row.monthBalance)}
                        </td>
                        <td
                          className={
                            row.finalBalance >= 0
                              ? "py-2.5 text-[#22c55e]"
                              : "py-2.5 text-[#ef4444]"
                          }
                        >
                          {formatMoney(row.finalBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
