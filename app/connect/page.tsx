"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Shield,
  Zap,
  Globe,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Loader2,
  LogOut,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { getExplorerLink } from "@/lib/stellar/explorer";
import { useStellar } from "@/context/StellarContext";
import { PayEasyLogo } from "@/components/ui/payeasy-logo";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { OnboardingCard } from "@/components/ui/onboarding-card";
import { isOnboarded, markOnboarded } from "@/components/ui/onboarding-card.helpers";
import FundTestnetButton from "@/components/wallet/FundTestnetButton";
import { getFreighterNetwork, isFreighterVersionSupported } from "@/lib/stellar/wallet";
import { getCurrentNetwork } from "@/lib/stellar/config";

const FEATURES = [
  {
    icon: Shield,
    title: "Non-Custodial",
    description: "Your keys, your funds. We never have access to your wallet.",
  },
  {
    icon: Zap,
    title: "Instant Transactions",
    description: "Stellar settles in ~5 seconds with near-zero fees.",
  },
  {
    icon: Globe,
    title: "Global Access",
    description: "Pay rent from anywhere in the world, in any currency.",
  },
];

type Step = "intro" | "connecting" | "connected";

export default function ConnectWalletPage() {
  const {
    publicKey,
    isConnected,
    isFreighterInstalled,
    isConnecting,
    connect,
    disconnect,
    error,
  } = useStellar();

  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<Step>("intro");
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [errorExpanded, setErrorExpanded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingNetwork, setCheckingNetwork] = useState(false);
  const [freighterNetwork, setFreighterNetwork] = useState<"TESTNET" | "MAINNET" | null>(null);
  const [isVersionOutdated, setIsVersionOutdated] = useState(false);

  useEffect(() => {
    if (isConnected && publicKey) {
      setStep("connected");
      if (!isOnboarded()) {
        setShowOnboarding(true);
      }
    } else if (isConnecting) {
      setStep("connecting");
    } else {
      setStep("intro");
    }
  }, [isConnected, isConnecting, publicKey]);

  const handleDismissOnboarding = () => {
    markOnboarded();
    setShowOnboarding(false);
  };

  const handleConnect = async () => {
    setStep("connecting");
    await connect();
  };

  const handleCopy = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setStep("intro");
  };

  const confirmDisconnect = () => {
    setShowDisconnectConfirm(true);
  };
  // Check Freighter network when connected
  useEffect(() => {
    if (isConnected && publicKey) {
      setCheckingNetwork(true);
      getFreighterNetwork()
        .then(setFreighterNetwork)
        .catch(() => setFreighterNetwork(null))
        .finally(() => setCheckingNetwork(false));
    } else {
      setFreighterNetwork(null);
    }
  }, [isConnected, publicKey]);

  // Check Freighter version on mount (only in browser, only when installed)
  useEffect(() => {
    if (!isFreighterInstalled) return;
    isFreighterVersionSupported().then((supported) => {
      setIsVersionOutdated(supported === false);
    });
  }, [isFreighterInstalled]);


  return (
    <main id="main-content" aria-label="Connect Wallet" className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(92,124,250,0.08) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(32,201,151,0.06) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-16 py-5"
      >
        <Link href="/">
          <PayEasyLogo size={30} />
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-dark-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-lg">
        <AnimatePresence mode="wait">
          {/* ── STEP: INTRO ── */}
          {step === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="mb-8 p-5 rounded-2xl glass-card"
                style={{
                  boxShadow: "0 0 40px rgba(92,124,250,0.15)",
                }}
              >
                <Wallet className="w-10 h-10 text-brand-400" />
              </motion.div>

              {/* Heading */}
              <h1 className="text-4xl sm:text-5xl font-bold text-center text-white mb-4 font-display">
                Connect Your{" "}
                <span className="gradient-text">Wallet</span>
              </h1>
              <p className="text-dark-400 text-center text-lg max-w-md mb-10 leading-relaxed">
                Link your Stellar wallet to start splitting rent with
                trustless escrow. Secure, instant, transparent.
              </p>

              {/* Outdated Freighter version banner */}
              {isVersionOutdated && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full glass-card p-4 border border-amber-500/30 bg-amber-500/10 space-y-2"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-amber-300 text-sm font-semibold">
                        Please update Freighter to version 10+.
                      </p>
                      <a
                        href="https://chrome.google.com/webstore/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium"
                      >
                        Update on Chrome Web Store
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Freighter detection */}
              {!isFreighterInstalled ? (
                <div className="w-full space-y-4">
                  <div className="glass-card p-5 flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm mb-1 font-display">
                        Freighter Wallet Required
                      </h3>
                      <p className="text-dark-500 text-sm leading-relaxed">
                        Install the Freighter browser extension to connect
                        your Stellar wallet to PayEasy.
                      </p>
                      <a
                        href="https://www.freighter.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-sm text-brand-400 hover:text-brand-300 transition-colors font-medium"
                      >
                        Get Freighter
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-4">
                  {/* Connect button */}
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="w-full group relative overflow-hidden rounded-2xl p-[1px] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-accent-500 rounded-2xl" />
                    <div className="relative flex items-center justify-center gap-3 bg-dark-950 hover:bg-dark-900 rounded-[15px] px-8 py-4 transition-colors">
                      <Wallet className="w-5 h-5 text-brand-400 group-hover:rotate-12 transition-transform" />
                      <span className="text-white font-semibold text-lg font-display">
                        Connect with Freighter
                      </span>
                      <ChevronRight className="w-5 h-5 text-dark-500 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  {/* Freighter detected badge */}
                  <div className="flex items-center justify-center gap-2 text-sm text-accent-400">
                    <div className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
                    Freighter detected
                  </div>
                </div>
              )}

              {/* Error display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full mt-4 glass-card p-4 border-red-500/20 space-y-2"
                  style={{ borderColor: "rgba(239,68,68,0.2)" }}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-red-300 text-sm flex-1">{error.message}</p>
                  </div>
                  <button
                    onClick={() => setErrorExpanded((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-dark-400 hover:text-dark-200 transition-colors ml-8"
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${errorExpanded ? "rotate-180" : ""}`}
                    />
                    What does this mean?
                  </button>
                  {errorExpanded && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="text-xs text-dark-400 leading-relaxed ml-8 border-l border-white/10 pl-3"
                    >
                      {error.help}
                    </motion.p>
                  )}
                </motion.div>
              )}

              {/* Feature cards */}
              <div className="w-full grid grid-cols-1 gap-3 mt-12">
                {FEATURES.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="glass-card p-4 flex items-center gap-4 hover:!transform-none"
                  >
                    <div className="p-2.5 rounded-xl bg-brand-500/5 border border-brand-500/10">
                      <feature.icon className="w-5 h-5 text-brand-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm font-display">
                        {feature.title}
                      </h3>
                      <p className="text-dark-500 text-xs mt-0.5 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── STEP: CONNECTING ── */}
          {step === "connecting" && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="mb-8 p-6 rounded-2xl glass-card">
                <Loader2 className="w-12 h-12 text-brand-400 animate-spin" />
              </div>

              <h2 className="text-3xl font-bold text-white mb-3 font-display">
                Connecting...
              </h2>
              <p className="text-dark-400 text-center max-w-sm leading-relaxed">
                Approve the connection request in your Freighter wallet
                extension. A popup should appear momentarily.
              </p>

              <motion.div
                className="mt-8 flex items-center gap-3"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="w-2 h-2 rounded-full bg-brand-400" />
                <div className="w-2 h-2 rounded-full bg-brand-500" />
                <div className="w-2 h-2 rounded-full bg-accent-400" />
              </motion.div>
            </motion.div>
          )}

          {/* ── STEP: CONNECTED ── */}
          {step === "connected" && publicKey && (
            <motion.div
              key="connected"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center"
            >
              {/* Success icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="mb-8 p-5 rounded-2xl glass-card"
                style={{
                  boxShadow: "0 0 40px rgba(32,201,151,0.15)",
                }}
              >
                <Check className="w-10 h-10 text-accent-400" />
              </motion.div>

              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 font-display">
                Wallet{" "}
                <span className="gradient-text">Connected</span>
              </h2>
              <p className="text-dark-400 text-center mb-8">
                You&apos;re ready to start using PayEasy.
              </p>
              {/* Network badge */}
              <div className="flex items-center justify-center gap-3 mb-6">
                {(() => {
                  const appNetwork = getCurrentNetwork();
                  const isAppTestnet = appNetwork === "testnet";
                  const badgeColor = isAppTestnet
                    ? "bg-green-500/10 text-green-400 border-green-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30";
                  return (
                    <div
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-black uppercase tracking-widest ${badgeColor} backdrop-blur-md`}
                    >
                      <div
                        className={`h-2 w-2 rounded-full ${isAppTestnet ? "bg-green-400" : "bg-amber-400"} animate-pulse`}
                      />
                      {isAppTestnet ? "Testnet" : "Mainnet"}
                    </div>
                  );
                })()}
                {checkingNetwork && (
                  <Loader2 className="h-4 w-4 text-dark-500 animate-spin" />
                )}
              </div>

              {/* Network mismatch warning */}
              {freighterNetwork !== null && (
                <div className="mb-6">
                  {(() => {
                    const appNetwork = getCurrentNetwork();
                    const isAppTestnet = appNetwork === "testnet";
                    const isFreighterTestnet = freighterNetwork === "TESTNET";
                    const mismatch = isAppTestnet !== isFreighterTestnet;
                    
                    if (mismatch) {
                      return (
                        <div className="glass-card p-4 border-red-500/20 bg-red-500/10">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-red-300 text-sm font-semibold">
                                Network mismatch
                              </p>
                              <p className="text-red-400 text-xs">
                                Switch Freighter to {isAppTestnet ? "Testnet" : "Mainnet"}.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="flex items-center justify-center gap-2 text-sm text-accent-400">
                        <div className="h-1.5 w-1.5 rounded-full bg-accent-400 animate-pulse" />
                        Network synchronized
                      </div>
                    );
                  })()}
                </div>
              )}


              {/* Address card */}
              <div className="w-full glass-card p-5 space-y-4 hover:!transform-none">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-dark-500 font-semibold font-display">
                    Your Address
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
                    <span className="text-xs text-accent-400 font-medium">
                      Connected
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-dark-200 bg-dark-950/60 rounded-xl px-4 py-3 font-mono truncate border border-white/5">
                    {publicKey}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="p-3 rounded-xl glass hover:bg-white/10 transition-colors shrink-0"
                    title="Copy address"
                  >
                    {copied ? (
                      <Check size={18} className="text-accent-400" />
                    ) : (
                      <Copy size={18} className="text-dark-400" />
                    )}
                  </button>
                  <a
                    href={getExplorerLink("account", publicKey)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl glass hover:bg-white/10 transition-colors shrink-0"
                    title="View on Stellar Expert"
                    aria-label="View on Stellar Expert"
                  >
                    <ExternalLink size={18} className="text-dark-400" />
                  </a>
                </div>

                {copied && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-accent-400 text-center"
                  >
                    Address copied to clipboard
                  </motion.p>
                )}
              </div>

              {/* Fund testnet */}
              <div className="w-full mt-4">
                <FundTestnetButton publicKey={publicKey} />
              </div>

              {/* First-time onboarding prompt */}
              {showOnboarding && (
                <div className="w-full mt-4">
                  <OnboardingCard onDismiss={handleDismissOnboarding} />
                </div>
              )}

              {/* Action buttons */}
              <div className="w-full grid grid-cols-2 gap-3 mt-6">
                <Link
                  href="/escrow/create"
                  className="btn-primary !justify-center !rounded-xl !py-3.5 text-sm"
                >
                  Create Escrow
                  <ChevronRight size={16} />
                </Link>
                <Link
                  href="/history"
                  className="btn-secondary !justify-center !rounded-xl !py-3.5 text-sm"
                >
                  View History
                </Link>
              </div>

              {/* Disconnect */}
              <button
                onClick={confirmDisconnect}
                className="mt-6 flex items-center gap-2 text-sm text-dark-500 hover:text-red-400 transition-colors"
              >
                <LogOut size={14} />
                Disconnect Wallet
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-6 text-xs text-dark-600 text-center"
      >
        Powered by Stellar blockchain. Your keys never leave your browser.
      </motion.p>

      <ConfirmDialog
        isOpen={showDisconnectConfirm}
        onClose={() => setShowDisconnectConfirm(false)}
        onConfirm={handleDisconnect}
        title="Disconnect Wallet?"
        description="Are you sure you want to disconnect your Stellar wallet? You will need to reconnect to create new escrows or manage your agreements."
        confirmText="Disconnect"
        variant="danger"
      />
    </main>
  );
}
