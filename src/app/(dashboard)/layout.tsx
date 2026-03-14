import { Sidebar } from "@/components/layout/Sidebar";
import { BalanceProvider } from "@/components/layout/BalanceContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <BalanceProvider>
      <div className="flex h-screen overflow-hidden bg-[#0d0d0d]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
    </BalanceProvider>
  );
}
