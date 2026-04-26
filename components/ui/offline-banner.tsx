"use client";

import { useState, useEffect } from "react";
import { WifiOff, CheckCircle } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowToast(false);
    } else if (wasOffline) {
      setShowToast(true);
      const timer = setTimeout(() => {
        setShowToast(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <>
      {/* Offline banner */}
      <div
        role="alert"
        aria-live="assertive"
        className={`fixed top-0 left-0 right-0 z-[100] transition-transform duration-300 ease-out ${
          !isOnline ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="bg-amber-500 text-amber-950 px-4 py-3 flex items-center justify-center gap-3 text-sm font-medium shadow-lg">
          <WifiOff size={16} className="shrink-0" />
          <span>
            You&apos;re offline — blockchain actions will fail until your connection is restored.
          </span>
        </div>
      </div>

      {/* Back online toast */}
      <div
        aria-live="polite"
        className={`fixed bottom-6 right-6 z-[100] transition-all duration-300 ease-out ${
          showToast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <div className="glass flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border border-accent-500/30">
          <CheckCircle size={16} className="text-accent-400 shrink-0" />
          <span className="text-sm font-medium text-white">Back online</span>
        </div>
      </div>
    </>
  );
}
