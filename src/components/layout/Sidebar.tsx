"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  MessageSquare,
  User,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/movimentacoes", icon: FileText, label: "Movimentações" },
  { href: "/investimentos", icon: TrendingUp, label: "Investimentos" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/perfil", icon: User, label: "Perfil" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-14 flex flex-col items-center py-5 gap-6 bg-[#0d0d0d] border-r border-[#1e1e2e] shrink-0">
      <button className="text-[#9ca3af] hover:text-white transition-colors p-1">
        <Menu size={20} />
      </button>

      <nav className="flex flex-col items-center gap-2 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                isActive
                  ? "bg-[#00d4aa]/10 text-[#00d4aa]"
                  : "text-[#9ca3af] hover:text-white hover:bg-[#1a1a2e]"
              )}
            >
              <Icon size={20} />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
