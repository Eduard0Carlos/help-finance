"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { RECURRENCE_FREQUENCIES, RecurrenceFrequency, TRANSACTION_CATEGORIES } from "@/types";
import { performMutationWithOfflineQueue } from "@/lib/offlineQueue";

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddTransactionModal({ open, onClose, onSuccess }: AddTransactionModalProps) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("outros");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0] ?? "");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>("monthly");
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const numAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Valor inválido");
      return;
    }

    const parsedInterval = Number.parseInt(recurrenceInterval, 10);
    if (isRecurring && (!Number.isInteger(parsedInterval) || parsedInterval <= 0)) {
      setError("Intervalo de recorrência inválido");
      return;
    }

    const recurrence = isRecurring
      ? {
          frequency: recurrenceFrequency,
          interval: parsedInterval,
          endDate: recurrenceEndDate || undefined,
        }
      : undefined;

    setLoading(true);
    const result = await performMutationWithOfflineQueue({
      url: "/api/transactions",
      method: "POST",
      body: { type, amount: numAmount, category, description, date, recurrence },
    });
    setLoading(false);
    if (!result.ok) {
      setError("Erro ao salvar");
      return;
    }
    setAmount("");
    setDescription("");
    setCategory("outros");
    setDate(new Date().toISOString().split("T")[0] ?? "");
    setIsRecurring(false);
    setRecurrenceFrequency("monthly");
    setRecurrenceInterval("1");
    setRecurrenceEndDate("");
    onSuccess();
    onClose();
  }

  const inputClass =
    "w-full bg-[#0d0d0d] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-white placeholder-[#9ca3af] focus:outline-none focus:border-[#00d4aa] transition-colors text-sm";

  return (
    <Modal open={open} onClose={onClose} title="Nova Movimentação">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Type toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              type === "expense"
                ? "bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#ef4444]"
                : "border border-[#2a2a3e] text-[#9ca3af] hover:border-[#ef4444]/40"
            }`}
          >
            Despesa
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              type === "income"
                ? "bg-[#22c55e]/20 border border-[#22c55e]/40 text-[#22c55e]"
                : "border border-[#2a2a3e] text-[#9ca3af] hover:border-[#22c55e]/40"
            }`}
          >
            Receita
          </button>
        </div>

        <input
          type="text"
          placeholder="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className={inputClass}
        />

        <input
          type="text"
          placeholder="Valor (ex: 150,00)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className={inputClass}
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClass}
        >
          {TRANSACTION_CATEGORIES.filter((c) =>
            type === "income"
              ? ["salario", "investimento", "outros"].includes(c.value)
              : !["salario"].includes(c.value)
          ).map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className={inputClass}
        />

        <label className="flex items-center justify-between gap-3 border border-[#2a2a3e] rounded-lg px-3 py-2.5">
          <span className="text-sm text-white">Movimentação recorrente</span>
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 accent-[#00d4aa]"
          />
        </label>

        {isRecurring && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={recurrenceFrequency}
                onChange={(e) => setRecurrenceFrequency(e.target.value as RecurrenceFrequency)}
                className={inputClass}
              >
                {RECURRENCE_FREQUENCIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                step={1}
                placeholder="A cada X"
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(e.target.value)}
                className={inputClass}
              />
            </div>

            <input
              type="date"
              value={recurrenceEndDate}
              min={date}
              onChange={(e) => setRecurrenceEndDate(e.target.value)}
              className={inputClass}
            />
          </>
        )}

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <div className="flex gap-2 mt-1">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
