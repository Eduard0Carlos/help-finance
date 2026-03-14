"use client";

import { useEffect } from "react";
import { flushOfflineQueue } from "@/lib/offlineQueue";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Ignore registration failures in unsupported contexts.
    });

    const handleOnline = () => {
      void flushOfflineQueue();
    };

    window.addEventListener("online", handleOnline);
    void flushOfflineQueue();

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
