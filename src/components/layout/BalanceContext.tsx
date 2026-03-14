"use client";

import { createContext, useContext, useState } from "react";

interface BalanceContextValue {
  hideBalance: boolean;
  toggleBalance: () => void;
}

const BalanceContext = createContext<BalanceContextValue>({
  hideBalance: false,
  toggleBalance: () => {},
});

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const [hideBalance, setHideBalance] = useState(false);
  const toggleBalance = () => setHideBalance((v) => !v);
  return (
    <BalanceContext.Provider value={{ hideBalance, toggleBalance }}>
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  return useContext(BalanceContext);
}
