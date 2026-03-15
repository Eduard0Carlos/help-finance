"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Eye, EyeOff } from "lucide-react";
import { useSession } from "@/components/layout/SessionContext";
import { useBalance } from "./BalanceContext";
import { formatCurrency } from "@/lib/utils";
import { ITransaction } from "@/types";

interface HeaderProps {
  title: string;
}

const TRANSACTIONS_UPDATED_EVENT = "hf-transactions-updated";

export function Header({ title }: HeaderProps) {
  const { user } = useSession();
  const { hideBalance, toggleBalance } = useBalance();
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [monthlyFamilyLimit, setMonthlyFamilyLimit] = useState<number | null>(null);

  const initials = user?.name
    ?.split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "HF";

  const loadCurrentBalance = useCallback(async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const [res, userRes] = await Promise.all([
        fetch(`/api/transactions?year=${year}&month=${month}`, {
          cache: "no-store",
        }),
        fetch("/api/user", { cache: "no-store" }),
      ]);
      if (!res.ok) return;

      const transactions = (await res.json()) as ITransaction[];
      const income = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      setCurrentBalance(income - expense);
      if (userRes.ok) {
        const userData = (await userRes.json()) as { monthlyFamilyLimit?: number };
        setMonthlyFamilyLimit(userData.monthlyFamilyLimit ?? null);
      }
    } catch {
      // Keep previous balance when request fails (e.g. offline).
    }
  }, []);

  useEffect(() => {
    function handleTransactionsUpdated() {
      void loadCurrentBalance();
    }

    const initialLoadTimer = window.setTimeout(() => {
      void loadCurrentBalance();
    }, 0);
    window.addEventListener(TRANSACTIONS_UPDATED_EVENT, handleTransactionsUpdated);

    return () => {
      window.clearTimeout(initialLoadTimer);
      window.removeEventListener(TRANSACTIONS_UPDATED_EVENT, handleTransactionsUpdated);
    };
  }, [loadCurrentBalance]);

  return (
    <header className="h-14 flex items-center justify-between px-3 md:px-6 pl-14 md:pl-6 border-b border-[#1e1e2e] shrink-0 overflow-hidden">
      <h1 className="text-lg md:text-xl font-bold text-white truncate min-w-0">{title}</h1>

      <div className="flex items-center gap-2 md:gap-3 shrink-0 min-w-0">
        <button className="hidden sm:block text-[#9ca3af] hover:text-white transition-colors p-1">
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
          } hidden sm:inline`}
          title="Saldo atual do mês"
        >
          {hideBalance ? "R$ ***********" : currentBalance === null ? "R$ 0,00" : formatCurrency(currentBalance)}
        </span>
        <span className="hidden md:inline text-[11px] text-[#9ca3af]" title="Meta mensal da família">
          Meta mensal família:{" "}
          <span className="text-white font-semibold">
            {monthlyFamilyLimit === null
              ? "-"
              : hideBalance
                ? "R$ ***"
                : formatCurrency(monthlyFamilyLimit)}
          </span>
        </span>

        <Link
          href="/perfil"
          title="Configurações de perfil"
          className="w-8 h-8 rounded-full bg-[#00d4aa] flex items-center justify-center text-[#0d0d0d] text-xs font-bold overflow-hidden hover:ring-2 hover:ring-[#00d4aa]/40 transition-all"
        >
          {user?.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.profileImage} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </Link>
      </div>
    </header>
  );
}
