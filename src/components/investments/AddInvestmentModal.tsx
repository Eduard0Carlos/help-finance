"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { INVESTMENT_TYPES } from "@/types";
import { performMutationWithOfflineQueue } from "@/lib/offlineQueue";

interface AddInvestmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddInvestmentModal({ open, onClose, onSuccess }: AddInvestmentModalProps) {
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"acao" | "fundo" | "international" | "renda_fixa">("acao");
  const [quantity, setQuantity] = useState("");
  const [averagePrice, setAveragePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0] ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const qty = parseFloat(quantity.replace(",", "."));
    const price = parseFloat(averagePrice.replace(",", "."));
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
      setError("Quantidade e preço devem ser positivos");
      return;
    }
    setLoading(true);
    const result = await performMutationWithOfflineQueue({
      url: "/api/investments",
      method: "POST",
      body: {
        ticker: ticker.toUpperCase(),
        name: name || ticker.toUpperCase(),
        type,
        quantity: qty,
        averagePrice: price,
        purchaseDate,
      },
    });
    setLoading(false);
    if (!result.ok) {
      setError("Erro ao salvar");
      return;
    }
    setTicker("");
    setName("");
    setQuantity("");
    setAveragePrice("");
    onSuccess();
    onClose();
  }

  const inputClass =
    "w-full bg-[#0d0d0d] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-white placeholder-[#9ca3af] focus:outline-none focus:border-[#00d4aa] transition-colors text-sm";

  return (
    <Modal open={open} onClose={onClose} title="Novo Investimento">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Ticker (ex: PETR4)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            required
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className={inputClass}
        >
          {INVESTMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Quantidade"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Preço Médio"
            value={averagePrice}
            onChange={(e) => setAveragePrice(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <input
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          required
          className={inputClass}
        />

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
