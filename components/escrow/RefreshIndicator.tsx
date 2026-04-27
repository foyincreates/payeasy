"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function RefreshIndicator({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const [seconds, setSeconds] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setSeconds(0);
    setIsRefreshing(false);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4">
      <div className="space-y-1">
        <p className="text-[10px] text-dark-600 uppercase tracking-[0.2em] font-black">Refreshed</p>
        <p className="text-xs text-dark-200 font-mono font-bold uppercase tracking-widest mt-1">
          {isRefreshing ? "Refreshing..." : seconds === 0 ? "just now" : `${seconds}s ago`}
        </p>
      </div>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-brand-500 hover:border-brand-400 hover:text-white transition-all outline-none"
        title="Refresh"
        aria-label="Refresh data"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
