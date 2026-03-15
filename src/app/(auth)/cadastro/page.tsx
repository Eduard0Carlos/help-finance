"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/components/layout/SessionContext";

type Step = "info" | "password";

export default function CadastroPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const [step, setStep] = useState<Step>("info");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim()) return;
    setStep("password");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("As senhas não coincidem");
      return;
    }
    if (password.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Erro ao criar conta");
      setLoading(false);
      return;
    }

    // Auto-login after registration
    const loginRes = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!loginRes.ok) {
      setError("Conta criada! Faça login para continuar.");
      setLoading(false);
      router.push("/login");
      return;
    }

    await refresh();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#0d0d0d] px-3 py-4 md:p-4">
      <div className="w-full max-w-md md:max-w-4xl flex flex-col md:flex-row rounded-2xl overflow-hidden shadow-2xl border border-[#2a2a3e] min-w-0">
        {/* Left - Branding */}
        <div className="flex-1 bg-gradient-to-br from-[#0d1a18] to-[#0a1a14] flex flex-col items-center justify-center p-5 md:p-10 gap-4 md:gap-6 min-w-0">
          <Image
            src="/branding/logo.png"
            alt="Logo HelpFinance"
            width={88}
            height={88}
            className="rounded-2xl"
            priority
          />
          <h2 className="text-2xl md:text-4xl font-bold text-white text-center">Help Finance</h2>
          <p className="text-[#9ca3af] text-center text-sm leading-relaxed max-w-xs">
            Bem vindo a melhor plataforma para controlar as suas finanças
          </p>
          <Link
            href="/login"
            className="border border-white text-white rounded-full px-6 md:px-8 py-3 min-h-[44px] text-sm font-semibold hover:bg-white hover:text-[#0d0d0d] transition-colors tracking-widest uppercase"
          >
            Entrar
          </Link>
        </div>

        {/* Right - Form */}
        <div className="flex-1 bg-gradient-to-br from-[#141420] to-[#0d1a18] p-5 md:p-10 flex flex-col items-center justify-center min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8">Criar Conta</h1>

          {/* Social buttons (disabled placeholder) */}
          <div className="flex gap-3 mb-6">
            {["f", "G", ""].map((label, i) => (
              <button
                key={i}
                disabled
                className="w-10 h-10 rounded-full border border-[#3a3a5e] flex items-center justify-center text-[#9ca3af] opacity-40 cursor-not-allowed text-sm font-bold"
              >
                {label || (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center w-full max-w-xs mb-6 gap-3 min-w-0">
            <div className="flex-1 h-px bg-[#2a2a3e]" />
            <span className="text-[#9ca3af] text-sm">ou</span>
            <div className="flex-1 h-px bg-[#2a2a3e]" />
          </div>

          {step === "info" ? (
            <form onSubmit={handleContinue} className="w-full max-w-xs flex flex-col gap-3 min-w-0">
              <input
                type="text"
                placeholder="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-transparent border border-[#2a2a3e] rounded-full px-4 py-3 min-h-[44px] text-white placeholder-[#9ca3af] focus:outline-none focus:border-[#00d4aa] transition-colors text-base md:text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-transparent border border-[#2a2a3e] rounded-full px-4 py-3 min-h-[44px] text-white placeholder-[#9ca3af] focus:outline-none focus:border-[#00d4aa] transition-colors text-base md:text-sm"
              />
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <button
                type="submit"
                className="mt-2 bg-[#2a2a3e] hover:bg-[#3a3a5e] text-white font-semibold rounded-full py-3 min-h-[44px] transition-colors text-sm tracking-widest uppercase"
              >
                Continuar
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="w-full max-w-xs flex flex-col gap-3 min-w-0">
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-transparent border border-[#2a2a3e] rounded-full px-4 py-3 min-h-[44px] text-white placeholder-[#9ca3af] focus:outline-none focus:border-[#00d4aa] transition-colors text-base md:text-sm"
              />
              <input
                type="password"
                placeholder="Confirmar Senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="bg-transparent border border-[#2a2a3e] rounded-full px-4 py-3 min-h-[44px] text-white placeholder-[#9ca3af] focus:outline-none focus:border-[#00d4aa] transition-colors text-base md:text-sm"
              />
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 bg-[#2a2a3e] hover:bg-[#3a3a5e] disabled:opacity-50 text-white font-semibold rounded-full py-3 min-h-[44px] transition-colors text-sm tracking-widest uppercase"
              >
                {loading ? "Criando..." : "Criar Conta"}
              </button>
              <button
                type="button"
                onClick={() => setStep("info")}
                className="text-[#9ca3af] text-xs text-center hover:text-white transition-colors"
              >
                Voltar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
