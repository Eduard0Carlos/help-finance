"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/components/layout/SessionContext";
import { formatCurrency } from "@/lib/utils";
import { IFamilyInvite, INVESTMENT_PROFILES } from "@/types";
import { LogOut } from "lucide-react";
import { performMutationWithOfflineQueue } from "@/lib/offlineQueue";

export default function PerfilPage() {
  const { user, logout, refresh } = useSession();
  const [dailyLimit, setDailyLimit] = useState(350);
  const [investmentGoal, setInvestmentGoal] = useState(4000);
  const [investmentProfile, setInvestmentProfile] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [familyEmail, setFamilyEmail] = useState("");
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familyMessage, setFamilyMessage] = useState("");
  const [incomingInvites, setIncomingInvites] = useState<IFamilyInvite[]>([]);
  const [outgoingInvites, setOutgoingInvites] = useState<
    Array<IFamilyInvite & { toUserName?: string; toUserEmail?: string }>
  >([]);

  const loadUserSettings = useCallback(async () => {
    const response = await fetch("/api/user");
    if (!response.ok) return;
    const profile = await response.json();
    setDailyLimit(profile.dailyLimit ?? 350);
    setInvestmentGoal(profile.investmentGoal ?? 4000);
    setInvestmentProfile(profile.investmentProfile ?? 1);
  }, []);

  const loadFamilyInvites = useCallback(async () => {
    const response = await fetch("/api/family/invite");
    if (!response.ok) return;
    const data = await response.json();
    setIncomingInvites(data.incoming ?? []);
    setOutgoingInvites(data.outgoing ?? []);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUserSettings();
      void loadFamilyInvites();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadFamilyInvites, loadUserSettings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await performMutationWithOfflineQueue({
      url: "/api/user",
      method: "PATCH",
      body: { dailyLimit, investmentGoal, investmentProfile },
    });
    setSaving(false);
    if (result.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (result.queued) {
        setFamilyMessage("Sem conexão: configurações enfileiradas para sincronizar.");
      }
    }
  }

  async function handleSendFamilyInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!familyEmail) return;

    setFamilyLoading(true);
    setFamilyMessage("");
    const response = await fetch("/api/family/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: familyEmail }),
    });
    const payload = await response.json().catch(() => ({}));
    setFamilyLoading(false);

    if (!response.ok) {
      setFamilyMessage(payload.error ?? "Erro ao enviar convite");
      return;
    }

    setFamilyEmail("");
    setFamilyMessage("Convite enviado com sucesso.");
    await loadFamilyInvites();
  }

  async function handleInviteResponse(inviteId: string, action: "accept" | "reject") {
    setFamilyLoading(true);
    setFamilyMessage("");
    const response = await fetch("/api/family/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId, action }),
    });
    const payload = await response.json().catch(() => ({}));
    setFamilyLoading(false);

    if (!response.ok) {
      setFamilyMessage(payload.error ?? "Não foi possível processar o convite");
      return;
    }

    setFamilyMessage(action === "accept" ? "Família vinculada com sucesso." : "Convite recusado.");
    await Promise.all([refresh(), loadFamilyInvites(), loadUserSettings()]);
  }

  async function handleUnlinkFamily() {
    setFamilyLoading(true);
    setFamilyMessage("");
    const response = await fetch("/api/family/unlink", { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    setFamilyLoading(false);

    if (!response.ok) {
      setFamilyMessage(payload.error ?? "Não foi possível desvincular");
      return;
    }

    setFamilyMessage("Família desvinculada com sucesso.");
    await Promise.all([refresh(), loadFamilyInvites(), loadUserSettings()]);
  }

  const inputClass =
    "w-full bg-[#0d0d0d] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-[#00d4aa] transition-colors text-sm";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Perfil" />
      <main className="flex-1 overflow-auto p-3 md:p-5 max-w-lg mx-auto w-full">
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

          <Card>
            <p className="text-xs text-[#9ca3af] mb-3">Família</p>

            {user?.familyId ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-[#2a2a3e] p-3">
                  <p className="text-sm text-white font-medium">Família ativa</p>
                  <p className="text-xs text-[#9ca3af] mt-1">
                    Compartilhando dados com{" "}
                    <span className="text-white">
                      {user.familyPartner?.name ?? user.familyPartner?.email ?? "membro da família"}
                    </span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleUnlinkFamily}
                  disabled={familyLoading}
                >
                  {familyLoading ? "Processando..." : "Desvincular família"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <form onSubmit={handleSendFamilyInvite} className="flex flex-col gap-2">
                  <label className="text-xs text-[#9ca3af]">Convidar por e-mail</label>
                  <input
                    type="email"
                    value={familyEmail}
                    onChange={(e) => setFamilyEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className={inputClass}
                  />
                  <Button type="submit" variant="primary" disabled={familyLoading}>
                    {familyLoading ? "Enviando..." : "Enviar convite"}
                  </Button>
                </form>

                {incomingInvites.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-[#9ca3af]">Convites recebidos</p>
                    {incomingInvites.map((invite) => (
                      <div
                        key={invite._id}
                        className="rounded-lg border border-[#2a2a3e] p-3 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{invite.fromUserName}</p>
                          <p className="text-xs text-[#9ca3af] truncate">{invite.fromUserEmail}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="primary"
                            onClick={() => handleInviteResponse(invite._id, "accept")}
                            disabled={familyLoading}
                          >
                            Aceitar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleInviteResponse(invite._id, "reject")}
                            disabled={familyLoading}
                          >
                            Recusar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {outgoingInvites.length > 0 && (
                  <div className="rounded-lg border border-[#2a2a3e] p-3">
                    <p className="text-xs text-[#9ca3af] mb-1">Convite pendente enviado para</p>
                    <p className="text-sm text-white">
                      {outgoingInvites[0]?.toUserName || outgoingInvites[0]?.toUserEmail}
                    </p>
                  </div>
                )}
              </div>
            )}

            {familyMessage && <p className="text-xs text-[#00d4aa] mt-3">{familyMessage}</p>}
          </Card>
        </div>
      </main>
    </div>
  );
}
