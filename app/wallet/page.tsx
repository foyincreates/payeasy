"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { useWallet } from "@/hooks/useWallet";
import { Copy, Plus, History, Coins, ArrowUpRight, ArrowDownLeft, CheckCircle2, Clock, XCircle, Check } from "lucide-react";

export default function WalletDashboard() {
  const router = useRouter();
  const { isConnected } = useWalletConnection();
  const { walletData, transactions, isLoading, error } = useWallet();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      router.push("/connect");
    }
  }, [isConnected, router]);

  if (!isConnected) return null;

  const handleCopy = () => {
    if (walletData?.address) {
      navigator.clipboard.writeText(walletData.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div className="animate-pulse flex flex-col space-y-4">
          <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-center">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Wallet Dashboard</h1>

      {/* Wallet Info Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Your Balance</h2>
            <div className="text-4xl font-bold text-gray-900 dark:text-white flex items-baseline gap-2">
              {walletData?.balance.toFixed(2)} <span className="text-lg text-gray-500 dark:text-gray-400 font-normal">XLM</span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900 px-3 py-1.5 rounded-full">
            <div className={`w-2 h-2 rounded-full ${walletData?.network === "testnet" ? "bg-amber-500" : "bg-emerald-500"}`}></div>
            <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">
              {walletData?.network}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
          <div className="flex-1 font-mono text-sm text-gray-600 dark:text-gray-300 break-all">
            <span className="md:hidden">{truncateAddress(walletData?.address || "")}</span>
            <span className="hidden md:inline">{walletData?.address}</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Copy Address"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => router.push("/escrow/create")}
          className="flex items-center justify-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Create Escrow
        </button>
        <button
          onClick={() => router.push("/wallet/history")}
          className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl transition-colors font-medium"
        >
          <History className="w-5 h-5" />
          View History
        </button>
        {walletData?.network === "testnet" && (
          <button
            className="flex items-center justify-center gap-2 p-4 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 rounded-xl transition-colors font-medium"
          >
            <Coins className="w-5 h-5" />
            Fund Testnet
          </button>
        )}
      </div>

      {/* Recent Transactions Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Transactions</h2>
        </div>
        
        {transactions.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === "receive" 
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" 
                      : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}>
                    {tx.type === "receive" ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">{tx.type}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(tx.date)}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`font-medium ${
                    tx.type === "receive" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"
                  }`}>
                    {tx.type === "receive" ? "+" : "-"}{tx.amount.toFixed(2)} XLM
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    {tx.status === "success" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    {tx.status === "pending" && <Clock className="w-3 h-3 text-amber-500" />}
                    {tx.status === "failed" && <XCircle className="w-3 h-3 text-red-500" />}
                    <span className="text-xs font-medium capitalize text-gray-500 dark:text-gray-400">
                      {tx.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No recent transactions found.
          </div>
        )}
      </div>
    </div>
  );
}
