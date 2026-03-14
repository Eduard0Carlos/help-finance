"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  LineChart,
  MessageSquare,
  User,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SIDEBAR_STORAGE_KEY = "hf.sidebar.expanded";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/movimentacoes", icon: FileText, label: "Movimentações" },
  { href: "/projecao", icon: LineChart, label: "Projeção" },
  { href: "/investimentos", icon: TrendingUp, label: "Investimentos" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/perfil", icon: User, label: "Perfil" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  function toggleSidebar() {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Ignore storage access errors.
      }
      return next;
    });
  }

  const [mobileOpen, setMobileOpen] = useState(false);

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed left-3 top-3 z-50 w-9 h-9 rounded-lg border border-[#2a2a3e] bg-[#141420] text-[#9ca3af] flex items-center justify-center"
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={closeMobileMenu}>
          <aside
            className="w-72 h-full bg-[#0d0d0d] border-r border-[#1e1e2e] p-4 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeMobileMenu}
              className="w-9 h-9 rounded-lg text-[#9ca3af] hover:text-white hover:bg-[#1a1a2e] flex items-center justify-center"
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
            <p className="text-white text-sm font-semibold px-2">HelpFinance</p>
            <nav className="flex flex-col gap-2">
              {navItems.map(({ href, icon: Icon, label }) => {
                const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMobileMenu}
                    className={cn(
                      "h-10 w-full px-3 rounded-xl flex items-center gap-3 transition-all",
                      isActive
                        ? "bg-[#00d4aa]/10 text-[#00d4aa]"
                        : "text-[#9ca3af] hover:text-white hover:bg-[#1a1a2e]"
                    )}
                  >
                    <Icon size={18} />
                    <span className="text-sm">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <aside
        className={cn(
          "hidden md:flex flex-col py-5 bg-[#0d0d0d] border-r border-[#1e1e2e] shrink-0 transition-all duration-300",
          isExpanded ? "w-64 px-3 gap-4" : "w-14 items-center gap-6"
        )}
      >
        <button
          onClick={toggleSidebar}
          className={cn(
            "text-[#9ca3af] hover:text-white transition-colors rounded-lg",
            isExpanded ? "w-full h-10 px-2 flex items-center gap-2 hover:bg-[#1a1a2e]" : "p-1"
          )}
          title={isExpanded ? "Recolher sidebar" : "Expandir sidebar"}
          aria-label={isExpanded ? "Recolher sidebar" : "Expandir sidebar"}
        >
          <Menu size={20} />
          {isExpanded && <span className="text-sm font-semibold text-white">HelpFinance</span>}
        </button>

        <nav className={cn("flex flex-col gap-2 flex-1", isExpanded ? "w-full" : "items-center")}>
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={isExpanded ? undefined : label}
                className={cn(
                  "rounded-xl transition-all",
                  isExpanded
                    ? "h-10 w-full px-3 flex items-center gap-3"
                    : "w-10 h-10 flex items-center justify-center",
                  isActive
                    ? "bg-[#00d4aa]/10 text-[#00d4aa]"
                    : "text-[#9ca3af] hover:text-white hover:bg-[#1a1a2e]"
                )}
              >
                <Icon size={20} />
                {isExpanded && <span className="text-sm">{label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
