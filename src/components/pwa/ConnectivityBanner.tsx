"use client";

import { useEffect, useState } from "react";
import { getOfflineQueueCount, subscribeQueueUpdates } from "@/lib/offlineQueue";

export function ConnectivityBanner() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [pending, setPending] = useState(() => getOfflineQueueCount());

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    const unsubscribeQueue = subscribeQueueUpdates(() => {
      setPending(getOfflineQueueCount());
    });

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      unsubscribeQueue();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (isOnline && pending === 0) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[60] px-3 py-2 pointer-events-none">
      <div
        className={`mx-auto max-w-2xl rounded-lg border px-3 py-2 text-xs text-center shadow-lg ${
          isOnline
            ? "bg-[#0b3b2f] border-[#22c55e]/40 text-[#a7f3d0]"
            : "bg-[#3f1d1d] border-[#ef4444]/40 text-[#fecaca]"
        }`}
      >
        {!isOnline
          ? `Sem conexão. ${pending > 0 ? `${pending} ação(ões) pendentes para sincronizar.` : "As novas ações serão enfileiradas."}`
          : `${pending} ação(ões) pendentes serão sincronizadas automaticamente.`}
      </div>
    </div>
  );
}
