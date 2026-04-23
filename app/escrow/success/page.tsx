"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import { CheckCircle2, Copy, Share2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const contractId = searchParams.get("id");

  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    if (!contractId) {
      router.push("/escrow/create");
      return;
    }

    // Trigger confetti animation
    void confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#22c55e", "#3b82f6", "#eab308", "#a855f7"],
    });

    // Auto redirect logic
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(`/escrow/${contractId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [contractId, router]);

  // Prevent rendering invalid state before redirect
  if (!contractId) {
    return null;
  }

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(contractId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // Ignore clipboard errors silently
    }
  };

  const handleShare = async () => {
    try {
      const link = `${window.location.origin}/escrow/${contractId}`;
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignore clipboard errors silently
    }
  };

  const handleViewEscrow = () => {
    router.push(`/escrow/${contractId}`);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg rounded-3xl glass p-8 text-center shadow-xl border border-white/10 bg-white/5 backdrop-blur-md"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20"
        >
          <CheckCircle2 className="h-10 w-10 text-green-400" />
        </motion.div>

        <h1 className="mb-2 text-3xl font-bold text-white">
          Escrow Created Successfully 🎉
        </h1>
        <p className="mb-8 text-zinc-300">
          Your rent escrow agreement is ready. You will be redirected to the escrow details page in <span className="font-semibold text-white">{countdown}</span> seconds.
        </p>

        <div className="mb-8 space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="mb-2 text-sm text-zinc-400">Contract ID</p>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-black/40 px-4 py-3 font-mono text-sm text-white">
              <span className="truncate">{contractId}</span>
              <button
                onClick={() => void handleCopyId()}
                className="flex shrink-0 items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/20"
              >
                {copiedId ? (
                  <span className="text-green-400">Copied!</span>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={handleViewEscrow}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 font-medium text-white transition-all hover:bg-blue-600 hover:scale-[1.02] active:scale-95 sm:w-auto"
          >
            View Escrow <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => void handleShare()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-medium text-white transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-95 sm:w-auto"
          >
            {copiedLink ? (
              <span className="text-green-400">Link Copied!</span>
            ) : (
              <>
                <Share2 className="h-4 w-4" /> Share with Roommates
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function EscrowSuccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center"><div className="animate-pulse text-zinc-400">Loading...</div></div>}>
      <SuccessContent />
    </Suspense>
  );
}
