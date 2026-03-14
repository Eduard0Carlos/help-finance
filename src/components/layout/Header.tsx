"use client";

import { useEffect, useState } from "react";
import { Bell, Eye, EyeOff } from "lucide-react";
import { useSession } from "@/components/layout/SessionContext";
import { useBalance } from "./BalanceContext";
import { formatCurrency } from "@/lib/utils";
import { ITransaction } from "@/types";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useSession();
  const { hideBalance, toggleBalance } = useBalance();
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);

  const initials = user?.name
    ?.split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "HF";

  useEffect(() => {
    async function loadCurrentBalance() {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const res = await fetch(`/api/transactions?year=${year}&month=${month}`);
      if (!res.ok) return;

      const transactions = (await res.json()) as ITransaction[];
      const income = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      setCurrentBalance(income - expense);
    }

    loadCurrentBalance();
  }, []);

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-[#1e1e2e] shrink-0">
      <h1 className="text-xl font-bold text-white">{title}</h1>

      <div className="flex items-center gap-3">
        <button className="text-[#9ca3af] hover:text-white transition-colors p-1">
          <Bell size={18} />
        </button>

        <button
          onClick={toggleBalance}
          className="text-[#9ca3af] hover:text-white transition-colors p-1"
          title={hideBalance ? "Mostrar saldo" : "Esconder saldo"}
        >
          {hideBalance ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>

        <span
          className={`text-sm font-semibold ${
            (currentBalance ?? 0) >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
          }`}
          title="Saldo atual do mês"
        >
          {currentBalance === null ? "R$ 0,00" : formatCurrency(currentBalance)}
        </span>

        <div className="w-8 h-8 rounded-full bg-[#00d4aa] flex items-center justify-center text-[#0d0d0d] text-xs font-bold overflow-hidden">
          {user?.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.profileImage} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
      </div>
    </header>
  );
}
