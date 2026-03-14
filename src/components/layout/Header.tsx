"use client";

import { Bell, Eye, EyeOff } from "lucide-react";
import { useSession } from "next-auth/react";
import { useBalance } from "./BalanceContext";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession();
  const { hideBalance, toggleBalance } = useBalance();

  const initials = session?.user?.name
    ?.split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "HF";

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

        <span className="text-[#9ca3af] text-sm">
          R$ {hideBalance ? "***********" : "•••••••••"}
        </span>

        <div className="w-8 h-8 rounded-full bg-[#00d4aa] flex items-center justify-center text-[#0d0d0d] text-xs font-bold overflow-hidden">
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
      </div>
    </header>
  );
}
