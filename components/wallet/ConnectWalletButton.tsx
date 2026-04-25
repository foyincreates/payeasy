"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, LogOut, Copy, Check, ChevronDown, ExternalLink, AlertCircle, Coins } from "lucide-react";
import { useStellarAuth } from "@/context/StellarContext";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useWalletBalance } from "@/hooks/useWalletBalance";

export default function ConnectWalletButton() {
  const { publicKey, isConnected, connect, disconnect, isConnecting, isFreighterInstalled, isRestoring, error } = useStellarAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorExpanded, setErrorExpanded] = useState(false);
  const { balance, isLoading: isBalanceLoading } = useWalletBalance(publicKey, isOpen);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  const truncatedKey = publicKey
    ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`
    : "";

  const handleCopy = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsOpen(false);
  };

  const confirmDisconnect = () => {
    setIsOpen(false);
    setShowConfirm(true);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isRestoring) {
    return (
      <button
        disabled
        className="glass-button flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 opacity-70 cursor-not-allowed"
      >
        <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
        <span className="text-sm font-medium text-white/70">Restoring session...</span>
      </button>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={() => {
            if (!isFreighterInstalled) {
              router.push("/connect");
            } else {
              connect();
            }
          }}
          disabled={isConnecting}
          className="btn-primary !py-2.5 !px-5 !text-sm !rounded-lg flex items-center gap-2 group transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <Wallet size={16} className="group-hover:rotate-12 transition-transform" />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>

        {error && (
          <div className="text-right max-w-[220px]">
            <div className="flex items-center justify-end gap-1.5">
              <AlertCircle size={12} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error.message}</p>
            </div>
            <button
              onClick={() => setErrorExpanded((v) => !v)}
              className="text-[11px] text-dark-500 hover:text-dark-300 transition-colors mt-0.5"
            >
              {errorExpanded ? "Hide details" : "What does this mean?"}
            </button>
            {errorExpanded && (
              <p className="text-[11px] text-dark-500 leading-relaxed mt-1 border-l border-white/10 pl-2 text-left">
                {error.help}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-button flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm font-medium text-white font-mono">{truncatedKey}</span>
        <ChevronDown 
          size={16} 
          className={`text-dark-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 top-full z-50 w-48 mt-2 glass rounded-xl border border-white/10 shadow-2xl overflow-hidden"
          >
            {/* Balance display */}
            <div className="px-3 py-2 border-b border-white/5 mb-1">
              <p className="text-[10px] text-dark-500 uppercase tracking-widest font-semibold mb-0.5">Balance</p>
              {isBalanceLoading ? (
                <div className="h-4 w-20 bg-dark-800/60 rounded animate-pulse" />
              ) : (
                <p className="text-sm font-mono text-white flex items-center gap-1.5">
                  <Coins size={13} className="text-brand-400" />
                  {balance ?? "—"} XLM
                </p>
              )}
            </div>

            <div className="p-1">
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-dark-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check size={16} className="text-emerald-500" />
                ) : (
                  <Copy size={16} />
                )}
                <span>{copied ? "Copied!" : "Copy Address"}</span>
              </button>
              
              <button
                onClick={() => { setIsOpen(false); router.push("/connect"); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-dark-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <ExternalLink size={16} />
                <span>Wallet Dashboard</span>
              </button>

              <div className="h-px bg-white/5 my-1" />

              <button
                onClick={confirmDisconnect}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span>Disconnect</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDisconnect}
        title="Disconnect Wallet?"
        description="Are you sure you want to disconnect? You'll need to reconnect to interact with your escrows."
        confirmText="Disconnect"
        variant="danger"
      />
    </div>
  );
}
