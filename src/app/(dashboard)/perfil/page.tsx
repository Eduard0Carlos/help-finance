"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/components/layout/SessionContext";
import { formatCurrency } from "@/lib/utils";
import { INVESTMENT_PROFILES } from "@/types";
import { LogOut } from "lucide-react";

export default function PerfilPage() {
  const { user, logout } = useSession();
  const [dailyLimit, setDailyLimit] = useState(350);
  const [investmentGoal, setInvestmentGoal] = useState(4000);
  const [investmentProfile, setInvestmentProfile] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/user").then(async (r) => {
      if (r.ok) {
        const u = await r.json();
        setDailyLimit(u.dailyLimit ?? 350);
        setInvestmentGoal(u.investmentGoal ?? 4000);
        setInvestmentProfile(u.investmentProfile ?? 1);
      }
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyLimit, investmentGoal, investmentProfile }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const inputClass =
    "w-full bg-[#0d0d0d] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-[#00d4aa] transition-colors text-sm";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Perfil" />
      <main className="flex-1 overflow-auto p-5 max-w-lg mx-auto w-full">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-[#00d4aa] flex items-center justify-center text-[#0d0d0d] text-xl font-bold">
                {user?.name?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <div>
                <p className="text-white font-bold text-lg">{user?.name}</p>
                <p className="text-[#9ca3af] text-sm">{user?.email}</p>
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-xs text-[#9ca3af] mb-4">Configurações Financeiras</p>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-[#9ca3af] block mb-1">
                  Limite Diário de Gastos
                </label>
                <input
                  type="number"
                  min={0}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                  className={inputClass}
                />
                <p className="text-[10px] text-[#9ca3af] mt-1">
                  Atual: {formatCurrency(dailyLimit)}
                </p>
              </div>

              <div>
                <label className="text-xs text-[#9ca3af] block mb-1">
                  Meta de Investimentos
                </label>
                <input
                  type="number"
                  min={0}
                  value={investmentGoal}
                  onChange={(e) => setInvestmentGoal(Number(e.target.value))}
                  className={inputClass}
                />
                <p className="text-[10px] text-[#9ca3af] mt-1">
                  Atual: {formatCurrency(investmentGoal)}
                </p>
              </div>

              <div>
                <label className="text-xs text-[#9ca3af] block mb-1">
                  Perfil de Investidor
                </label>
                <select
                  value={investmentProfile}
                  onChange={(e) => setInvestmentProfile(Number(e.target.value))}
                  className={inputClass}
                >
                  {INVESTMENT_PROFILES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.value} - {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit" variant="primary" disabled={saving}>
                {saved ? "Salvo!" : saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </form>
          </Card>

          <Card>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-[#ef4444] hover:text-red-300 transition-colors text-sm font-medium"
            >
              <LogOut size={16} />
              Sair da conta
            </button>
          </Card>
        </div>
      </main>
    </div>
  );
}
