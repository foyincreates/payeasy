"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  KeyRound,
  Loader2,
  Send,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

import { useStellar } from "@/context/StellarContext";
import {
  type ApprovalState,
  type MultiSigConfig,
  type Signer,
  type WalletSignTransaction,
  accumulatedWeight,
  approveRelease,
  approvedRoommateCount,
  hasLandlordApproval,
  isReleaseApproved,
  mockApproval,
  pendingSigners,
  requiredRoommateApprovals,
  mergeApprovalSignatures,
} from "@/lib/stellar/multisig";

interface SignerRowProps {
  signer: Signer;
  approval?: ApprovalState;
  canApprove: boolean;
  isCurrentWallet: boolean;
  loading: boolean;
  onApprove: (address: string) => void;
}

function formatAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function SignerRow({
  signer,
  approval,
  canApprove,
  isCurrentWallet,
  loading,
  onApprove,
}: SignerRowProps) {
  const approved = Boolean(approval);
  const isLandlord = signer.role === "landlord";

  return (
    <div
      className={`rounded-2xl border px-4 py-4 transition-colors ${
        approved
          ? "border-accent-400/40 bg-accent-500/10"
          : isCurrentWallet
            ? "border-brand-400/40 bg-brand-500/10"
            : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              isLandlord
                ? "border-brand-400/40 bg-brand-500/15 text-brand-200"
                : "border-accent-400/30 bg-accent-500/10 text-accent-200"
            }`}
          >
            {isLandlord ? (
              <ShieldCheck className="h-5 w-5" />
            ) : (
              <Users className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold capitalize text-dark-100">
                {signer.role}
              </p>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-dark-400">
                Weight {signer.weight}
              </span>
            </div>
            <p className="mt-1 truncate font-mono text-xs text-dark-500">
              {formatAddress(signer.address)}
            </p>
          </div>
        </div>

        {approved ? (
          <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent-400/30 bg-accent-500/10 px-3 py-2 text-xs font-bold text-accent-200">
            <Check className="h-4 w-4" />
            Approved
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onApprove(signer.address)}
            disabled={!canApprove || loading}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed ${
              canApprove
                ? "bg-brand-500 text-white hover:bg-brand-400"
                : "border border-white/10 bg-white/5 text-dark-600"
            }`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {loading ? "Signing" : isCurrentWallet ? "Approve" : "Switch wallet"}
          </button>
        )}
      </div>
    </div>
  );
}

interface MultiSigApprovalProps {
  config: MultiSigConfig;
  releaseTransactionXdr?: string;
  initialApprovals?: ApprovalState[];
  connectedAddress?: string | null;
  signTransaction?: WalletSignTransaction;
  onApprovalChange?: (approvals: ApprovalState[]) => void;
  onRelease?: (mergedXdr: string, approvals: ApprovalState[]) => void | Promise<void>;
  mockMode?: boolean;
}

export default function MultiSigApproval({
  config,
  releaseTransactionXdr,
  initialApprovals = [],
  connectedAddress,
  signTransaction,
  onApprovalChange,
  onRelease,
  mockMode = false,
}: MultiSigApprovalProps) {
  const { publicKey, isConnected, connect, isConnecting } = useStellar();
  const [approvals, setApprovals] = useState<ApprovalState[]>(initialApprovals);
  const [loading, setLoading] = useState<string | null>(null);
  const [released, setReleased] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAddress = connectedAddress ?? publicKey;
  const approvalWeight = accumulatedWeight(approvals, config);
  const landlordApproved = hasLandlordApproval(approvals, config);
  const roommateApprovals = approvedRoommateCount(approvals, config);
  const roommateRequired = requiredRoommateApprovals(config);
  const releaseReady = isReleaseApproved(approvals, config);
  const pendingCount = pendingSigners(approvals, config).length;
  const progressPercent = Math.min((approvalWeight / config.threshold) * 100, 100);

  const signerByAddress = useMemo(() => {
    return new Map(config.signers.map((signer) => [signer.address, signer]));
  }, [config.signers]);

  const runWalletSignature = useCallback<WalletSignTransaction>(
    async (xdr, options) => {
      if (signTransaction) {
        return signTransaction(xdr, options);
      }

      const freighter = await import("@stellar/freighter-api");
      return freighter.signTransaction(xdr, {
        networkPassphrase: options.networkPassphrase,
      });
    },
    [signTransaction]
  );

  const commitApprovals = useCallback(
    (nextApprovals: ApprovalState[]) => {
      setApprovals(nextApprovals);
      onApprovalChange?.(nextApprovals);
    },
    [onApprovalChange]
  );

  const handleApprove = useCallback(
    async (signerAddress: string) => {
      setError(null);

      const signer = signerByAddress.get(signerAddress);
      if (!signer) {
        setError("This wallet is not configured as a release signer.");
        return;
      }

      if (approvals.some((approval) => approval.signerAddress === signerAddress)) {
        return;
      }

      if (!mockMode && activeAddress !== signerAddress) {
        setError("Connect the signer wallet before approving this release.");
        return;
      }

      if (!mockMode && !releaseTransactionXdr) {
        setError("Release transaction XDR is required before collecting approvals.");
        return;
      }

      try {
        setLoading(signerAddress);
        const approval = mockMode
          ? mockApproval(signerAddress)
          : await approveRelease({
              signerAddress,
              transactionXdr: releaseTransactionXdr as string,
              config,
              signTransaction: runWalletSignature,
              network: config.networkPassphrase.includes("Test") ? "TESTNET" : "PUBLIC",
            });

        commitApprovals([
          ...approvals.filter((item) => item.signerAddress !== signerAddress),
          approval,
        ]);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Approval signing failed.");
      } finally {
        setLoading(null);
      }
    },
    [
      activeAddress,
      approvals,
      commitApprovals,
      config,
      mockMode,
      releaseTransactionXdr,
      runWalletSignature,
      signerByAddress,
    ]
  );

  const handleRelease = useCallback(async () => {
    if (!releaseReady) {
      setError("Landlord approval, roommate majority, and threshold are required.");
      return;
    }

    try {
      setLoading("release");
      setError(null);
      const mergedXdr =
        mockMode && !releaseTransactionXdr
          ? JSON.stringify({ approvals, escrowAccountId: config.escrowAccountId })
          : mergeApprovalSignatures(approvals, config);

      await onRelease?.(mergedXdr, approvals);
      setReleased(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Release submission failed.");
    } finally {
      setLoading(null);
    }
  }, [approvals, config, mockMode, onRelease, releaseReady, releaseTransactionXdr]);

  return (
    <section className="glass-card p-6 sm:p-8">
      <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Multi-Sig Release
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Release Approvals</h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-dark-400">
              Landlord signature plus {roommateRequired} roommate
              {roommateRequired === 1 ? "" : "s"} required before the release
              transaction can be submitted.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-dark-500">
            Approval Weight
          </p>
          <p className="mt-1 text-2xl font-black text-white">
            {approvalWeight}
            <span className="text-sm text-dark-500"> / {config.threshold}</span>
          </p>
          <div className="mt-3 h-2 w-48 max-w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all ${
                releaseReady ? "bg-accent-400" : "bg-brand-400"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-dark-500">
            Landlord
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm font-bold text-dark-100">
            {landlordApproved ? (
              <Check className="h-4 w-4 text-accent-300" />
            ) : (
              <UserCheck className="h-4 w-4 text-dark-500" />
            )}
            {landlordApproved ? "Approved" : "Pending"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-dark-500">
            Roommates
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm font-bold text-dark-100">
            <Users className="h-4 w-4 text-brand-300" />
            {roommateApprovals} / {roommateRequired}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-dark-500">
            Wallet
          </p>
          {isConnected || activeAddress ? (
            <p className="mt-2 truncate font-mono text-xs font-bold text-dark-200">
              {formatAddress(activeAddress ?? "")}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                void connect();
              }}
              disabled={isConnecting}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Connect
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {config.signers.map((signer) => {
          const approval = approvals.find(
            (item) => item.signerAddress === signer.address
          );
          const isCurrentWallet = mockMode || activeAddress === signer.address;
          const canApprove =
            !approval &&
            (mockMode || Boolean(releaseTransactionXdr)) &&
            isCurrentWallet &&
            loading === null;

          return (
            <SignerRow
              key={signer.address}
              signer={signer}
              approval={approval}
              canApprove={canApprove}
              isCurrentWallet={isCurrentWallet}
              loading={loading === signer.address}
              onApprove={handleApprove}
            />
          );
        })}
      </div>

      {error ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-medium text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {released ? (
        <div className="mt-5 rounded-2xl border border-accent-400/40 bg-accent-500/10 p-4 text-sm font-bold text-accent-100">
          Release transaction is approved and ready for network submission.
        </div>
      ) : (
        <footer className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-dark-500">
            {releaseReady
              ? "Threshold satisfied."
              : `${pendingCount} signer${pendingCount === 1 ? "" : "s"} pending.`}
            {mockMode ? " Mock mode is active." : ""}
          </p>
          <button
            type="button"
            onClick={() => {
              void handleRelease();
            }}
            disabled={!releaseReady || loading === "release"}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 py-3 text-sm font-black text-dark-950 transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-dark-600"
          >
            {loading === "release" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {loading === "release" ? "Preparing" : "Release Funds"}
          </button>
        </footer>
      )}
    </section>
  );
}
