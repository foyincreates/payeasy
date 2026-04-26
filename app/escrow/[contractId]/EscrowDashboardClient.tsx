"use client";

import { useState, useCallback } from "react";
import EscrowStatus from "@/components/escrow/EscrowStatus";
import FundingProgress from "@/components/escrow/FundingProgress";
import MultiSigApproval from "@/components/escrow/MultiSigApproval";
import RoommateList from "@/components/escrow/RoommateList";
import ContributeForm from "@/components/escrow/ContributeForm";
import EscrowDashboardSkeleton from "@/components/escrow/EscrowDashboardSkeleton";
import TransactionReview from "@/components/wallet/TransactionReview";
import {
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  Activity,
  Globe,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { getExplorerLink } from "@/lib/stellar/explorer";
import { createLandlordMajorityConfig } from "@/lib/stellar/multisig";
import RefreshIndicator from "@/components/escrow/RefreshIndicator";
import { useStellar } from "@/context/StellarContext";
import { claimRefund, stroopsToXlm } from "@/lib/stellar/actions/claimRefund";
import useContractPolling from "@/hooks/useContractPolling";
import { buildReleaseXdr, signAndSubmitRelease } from "@/lib/stellar/actions/release";
import { useToast } from "@/hooks/useToast";
import CopyButton from "@/components/ui/copy-button";
import { DeadlineCountdown } from "@/components/escrow/DeadlineCountdown";

interface Props {
  contractId: string;
}

type ReleasePhase = "idle" | "building" | "review" | "submitting";

function formatContractId(contractId: string): string {
  if (contractId.length <= 10) return contractId;
  return `${contractId.slice(0, 4)}...${contractId.slice(-4)}`;
}

export default function EscrowDashboardClient({ contractId }: Props) {
  const { contractState, isLoading, error, refresh } = useContractPolling(contractId);
  const { isConnected, publicKey } = useStellar();
  const toast = useToast();

  const [releasePhase, setReleasePhase] = useState<ReleasePhase>("idle");
  const [preparedXdr, setPreparedXdr] = useState<string | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [isClaimingRefund, setIsClaimingRefund] = useState(false);

  const isLandlord =
    isConnected &&
    publicKey !== null &&
    contractState !== null &&
    publicKey === contractState.landlord;

  const currentRoommate = contractState?.roommates.find(
    (r) => r.address === publicKey
  );

  const nowEpoch = Math.floor(Date.now() / 1000);
  const isDeadlinePassed =
    contractState != null && nowEpoch > contractState.deadlineEpoch;
  const isNotFullyFunded = contractState?.status !== "funded";
  const hasNonZeroPaid =
    currentRoommate != null && BigInt(currentRoommate.paidAmount) > BigInt(0);
  const showClaimRefundButton = isDeadlinePassed && isNotFullyFunded && hasNonZeroPaid;

  async function handleReleaseFunds() {
    if (!contractState) return;
    setReleasePhase("building");
    setReleaseError(null);
    try {
      const xdr = await buildReleaseXdr({
        contractId,
        landlordAddress: contractState.landlord,
      });
      setPreparedXdr(xdr);
      setReleasePhase("review");
    } catch (err) {
      setReleaseError(err instanceof Error ? err.message : "Failed to prepare transaction.");
      setReleasePhase("idle");
    }
  }

  async function handleConfirmRelease() {
    if (!preparedXdr || !contractState) return;
    setReleasePhase("submitting");
    try {
      await signAndSubmitRelease(preparedXdr, contractState.landlord);
      toast.success("Funds released to landlord.");
      setReleasePhase("idle");
      setPreparedXdr(null);
      setReleaseError(null);
      await refresh();
    } catch (err) {
      setReleaseError(err instanceof Error ? err.message : "Transaction failed.");
      setReleasePhase("idle");
    }
  }

  function handleCancelRelease() {
    setReleasePhase("idle");
    setPreparedXdr(null);
    setReleaseError(null);
  }

  const handleClaimRefund = useCallback(async () => {
    if (!publicKey || !contractState) return;
    setIsClaimingRefund(true);
    try {
      const result = await claimRefund({
        contractId,
        roommateAddress: publicKey,
        deadlineTimestamp: contractState.deadlineEpoch,
        refundableAmount: currentRoommate?.paidAmount,
      });
      const xlmAmount = stroopsToXlm(result.refundedAmount);
      toast.success(`Refund of ${xlmAmount} XLM sent.`);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Refund failed.";
      toast.error(message);
    } finally {
      setIsClaimingRefund(false);
    }
  }, [publicKey, contractState, contractId, currentRoommate, refresh, toast]);

  const multiSigConfig = contractState
    ? createLandlordMajorityConfig({
        escrowAccountId: contractState.id,
        landlordAddress: contractState.landlord,
        roommateAddresses: contractState.roommates.map((r) => r.address),
      })
    : null;

  const truncatedContractId = formatContractId(contractId);

  return (
    <main id="main-content" aria-label="Escrow Dashboard" className="min-h-screen pt-32 pb-24 relative overflow-hidden bg-[#07070a]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(92,124,250,0.1),transparent_50%)] pointer-events-none" />
      <div className="mesh-gradient opacity-30 mix-blend-screen pointer-events-none fixed inset-0 saturate-150" />

      {/* TransactionReview modal overlay */}
      {(releasePhase === "review" || releasePhase === "submitting") && preparedXdr && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <TransactionReview
            xdr={preparedXdr}
            network="testnet"
            destination={contractState?.landlord}
            onConfirm={handleConfirmRelease}
            onCancel={handleCancelRelease}
            isSubmitting={releasePhase === "submitting"}
          />
        </div>
      )}

      <div className="container relative z-10 mx-auto px-6 max-w-6xl">
        {/* Navigation Breadcrumb */}
        <nav className="mb-14 flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-in fade-in slide-in-from-left-4 duration-700">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2.5 text-dark-400 hover:text-brand-300 transition-all group font-black text-[10px] uppercase tracking-[0.2em]"
          >
            <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 group-hover:bg-brand-500 group-hover:border-brand-400 group-hover:text-white transition-all">
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </div>
            Agreement Registry
          </Link>

          <div className="flex items-center gap-4 bg-dark-900/60 border border-white/5 px-5 py-3 rounded-2xl backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-2 pr-4 border-r border-white/10">
              <div className="h-2 w-2 rounded-full bg-accent-400 animate-pulse shadow-[0_0_8px_rgba(32,201,151,0.5)]" />
              <span className="text-[10px] text-dark-200 font-black uppercase tracking-widest italic flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-brand-400" />
                Live Syncing
              </span>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-[10px] text-dark-500 font-black uppercase tracking-widest truncate max-w-[140px] md:max-w-none font-mono">
                CX: {truncatedContractId}
              </p>
              <CopyButton value={contractId} label="Copy full contract ID" />
              <a
                href={getExplorerLink("contract", contractId)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-dark-500 hover:text-brand-400 hover:bg-white/5 transition-all outline-none"
                title="View on Stellar Expert"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </nav>

        {/* Header */}
        <header className="mb-20 space-y-8 animate-in fade-in slide-in-from-top-12 duration-1000 ease-out fill-mode-backwards delay-100">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-dark-400 text-[10px] font-black uppercase tracking-widest shadow-inner">
              <Globe className="h-3.5 w-3.5 text-brand-500" />
              Contract Overview
            </div>
            <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.85] bg-gradient-to-br from-white via-white to-dark-600 bg-clip-text text-transparent">
              Escrow <span className="text-brand-400">Intelligence</span>
            </h1>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12">
            <p className="text-dark-500 text-lg md:text-xl font-medium leading-relaxed max-w-2xl">
              Auditing the real-time on-chain status of your rent agreement. Every byte of funding is cryptographically secured on the{" "}
              <span className="text-white font-black italic">Stellar Ledger</span>.
            </p>
            <div className="h-16 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent hidden md:block" />
            <div className="flex flex-wrap items-center gap-6">
              <DeadlineCountdown deadlineEpoch={contractState?.deadlineEpoch || 0} />
              <RefreshIndicator onRefresh={refresh} />
            </div>
          </div>
        </header>

        {/* Dashboard Grid — skeleton or real content */}
        <div className="space-y-12">
          {isLoading ? (
            <EscrowDashboardSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in">
              <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-12 w-12 text-red-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">Unable to Load Contract</h2>
                <p className="text-dark-400 text-base max-w-md mx-auto">{error}</p>
              </div>
              <button
                onClick={() => void refresh()}
                className="btn-primary px-6 py-3 rounded-xl font-black uppercase tracking-widest"
              >
                Retry
              </button>
            </div>
          ) : (
            <div
              className="space-y-12 animate-in fade-in duration-700 ease-out"
              style={{ animationFillMode: "backwards" }}
            >
              <div className="space-y-4">
                <EscrowStatus
                  landlordAddress={contractState!.landlord}
                  totalRent={contractState!.totalRent}
                  deadline={contractState!.deadline}
                  status={contractState!.status}
                />

                {/* Release Funds — landlord only */}
                {isLandlord && (
                  <div className="flex flex-col gap-3">
                    {releaseError && (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {releaseError}
                      </div>
                    )}
                    <button
                      onClick={() => void handleReleaseFunds()}
                      disabled={releasePhase !== "idle"}
                      className="inline-flex items-center gap-2 w-full sm:w-auto justify-center btn-primary !py-3 !px-6 !rounded-xl font-black uppercase tracking-widest shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {releasePhase === "building" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Preparing...
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="h-4 w-4" />
                          Release Funds
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <FundingProgress
                  totalFunded={contractState!.totalFunded}
                  totalRequired={Number(contractState!.totalRent)}
                />

                <div className="glass-card p-10 flex flex-col items-center justify-center text-center gap-8 border-dashed border-white/10 group transition-all hover:bg-brand-500/10 hover:border-brand-500/40 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(92,124,250,0.1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="p-6 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 shadow-2xl group-hover:scale-110 group-hover:-rotate-3 shadow-brand-500/10 transition-all duration-1000 relative z-10">
                    <ShieldCheck className="h-12 w-12" />
                  </div>
                  <div className="space-y-3 relative z-10">
                    <h3 className="text-white font-black text-2xl uppercase tracking-widest">Protocol Secured</h3>
                    <p className="text-dark-400 text-base font-medium leading-relaxed max-w-sm">
                      This agreement is governed by the{" "}
                      <span className="text-brand-300 font-bold">PayEasy Rent Protocol</span>. Assets are only releasable once full funding is achieved or the refund window opens.
                    </p>
                  </div>
                  <button className="btn-secondary !py-3 !px-10 !text-[11px] !border-white/10 hover:!border-brand-400/50 hover:!bg-brand-500/10 !text-dark-100 !rounded-2xl transition-all relative z-10 font-black uppercase tracking-widest">
                    Explore Contract Rules
                  </button>
                </div>
              </div>

              <RoommateList roommates={contractState!.roommates} />

              {/* Contribute Form — visible only to the current roommate if they haven't paid full share */}
              {currentRoommate && !currentRoommate.isPaid && contractState?.status !== "funded" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <ContributeForm
                    escrowId={contractId}
                    expectedShare={currentRoommate.expectedShare}
                    remainingBalance={(
                      Number(currentRoommate.expectedShare) - Number(currentRoommate.paidAmount)
                    ).toFixed(2).replace(/\.00$/, "")}
                    onSuccess={() => void refresh()}
                  />
                </div>
              )}

              {/* Claim Refund — visible only when eligible */}
              {showClaimRefundButton && (
                <div className="glass-card p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border border-amber-500/20 bg-amber-500/5">
                  <div className="space-y-1 text-center sm:text-left">
                    <h3 className="text-white font-black text-lg uppercase tracking-widest">
                      Refund Available
                    </h3>
                    <p className="text-dark-400 text-sm">
                      The funding deadline has passed and the escrow was not fully funded. You can reclaim your deposit.
                    </p>
                  </div>
                  <button
                    onClick={() => void handleClaimRefund()}
                    disabled={isClaimingRefund}
                    className="btn-primary !w-full sm:!w-auto !justify-center !py-3 !px-8 !rounded-xl font-black uppercase tracking-widest flex items-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    {isClaimingRefund ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4" />
                        Claim Refund
                      </>
                    )}
                  </button>
                </div>
              )}

              <MultiSigApproval config={multiSigConfig!} mockMode />
            </div>
          )}
        </div>
      </div>

      <div className="absolute top-1/2 -left-20 w-80 h-80 bg-brand-500/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-accent-500/5 blur-[120px] rounded-full pointer-events-none" />
    </main>
  );
}
