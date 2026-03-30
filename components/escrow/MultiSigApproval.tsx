"use client";

import { useState, useCallback } from "react";
import {
  type MultiSigConfig,
  type ApprovalState,
  type Signer,
  accumulatedWeight,
  isThresholdMet,
  pendingSigners,
  mockApproval,
} from "@/lib/stellar/multisig";

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressRing({
  value,
  max,
  size = 72,
}: {
  value: number;
  max: number;
  size?: number;
}) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = Math.min(value / max, 1);
  const dash = fill * circ;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        className="text-zinc-800"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        className={fill >= 1 ? "text-emerald-400" : "text-amber-400"}
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
    </svg>
  );
}

function SignerRow({
  signer,
  approval,
  isConnected,
  onApprove,
  loading,
}: {
  signer: Signer;
  approval?: ApprovalState;
  isConnected: boolean;
  onApprove: (address: string) => void;
  loading: boolean;
}) {
  const approved = !!approval;
  const canApprove = isConnected && !approved;

  return (
    <div
      className={`
        flex items-center justify-between rounded-xl border px-4 py-3
        transition-all duration-300
        ${approved
          ? "border-emerald-500/30 bg-emerald-950/20"
          : "border-zinc-800 bg-zinc-900/60"
        }
      `}
    >
      {/* Left: identity */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`
            h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0
            ${signer.role === "landlord"
              ? "bg-violet-900/60 text-violet-300"
              : "bg-sky-900/60 text-sky-300"
            }
          `}
        >
          {signer.role === "landlord" ? "LL" : "RM"}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100 capitalize">
            {signer.role}
          </p>
          <p className="text-xs text-zinc-500 font-mono truncate max-w-[160px]">
            {signer.address.slice(0, 6)}…{signer.address.slice(-6)}
          </p>
        </div>
      </div>

      {/* Right: weight badge + action */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
          w:{signer.weight}
        </span>

        {approved ? (
          <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Signed
          </span>
        ) : (
          <button
            onClick={() => onApprove(signer.address)}
            disabled={!canApprove || loading}
            className={`
              rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200
              ${canApprove
                ? "bg-amber-500 text-black hover:bg-amber-400 active:scale-95"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              }
            `}
          >
            {loading ? "Signing…" : "Approve"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface MultiSigApprovalProps {
  config: MultiSigConfig;
  /** Address of the currently connected wallet */
  connectedAddress?: string;
  /** Called with final merged XDR when threshold is met */
  onRelease?: (mergedXdr: string) => void;
  /** For demo/testing: simulate signing without a real wallet */
  mockMode?: boolean;
}

export default function MultiSigApproval({
  config,
  connectedAddress,
  onRelease,
  mockMode = false,
}: MultiSigApprovalProps) {
  const [approvals, setApprovals] = useState<ApprovalState[]>([]);
  const [loading, setLoading] = useState<string | null>(null); // signer address being processed
  const [released, setReleased] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weight = accumulatedWeight(approvals, config);
  const thresholdMet = isThresholdMet(approvals, config);
  const remaining = pendingSigners(approvals, config);

  const handleApprove = useCallback(
    async (signerAddress: string) => {
      setError(null);
      setLoading(signerAddress);

      try {
        if (mockMode) {
          // Simulate network latency
          await new Promise((r) => setTimeout(r, 800));
          const approval = mockApproval(signerAddress);
          setApprovals((prev) => [...prev, approval]);
        } else {
          // Real Freighter wallet integration point
          if (!window.freighter) {
            throw new Error("Freighter wallet not found. Please install it.");
          }
          const { signTransaction } = await import("@stellar/freighter-api");
          // In a real flow: build the tx, get XDR, sign, collect signature
          throw new Error(
            "Real signing not yet wired — pass mockMode or implement buildReleaseTransaction flow."
          );
        }
      } catch (err: any) {
        setError(err.message ?? "Signing failed");
      } finally {
        setLoading(null);
      }
    },
    [mockMode]
  );

  const handleRelease = useCallback(async () => {
    setLoading("release");
    try {
      await new Promise((r) => setTimeout(r, 600));
      const fakeXdr = btoa(JSON.stringify({ approvals, config }));
      setReleased(true);
      onRelease?.(fakeXdr);
    } finally {
      setLoading(null);
    }
  }, [approvals, config, onRelease]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md space-y-4">

        {/* Header card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                Escrow Release
              </p>
              <h1 className="text-xl font-bold text-white">Multi-Sig Approval</h1>
              <p className="text-xs text-zinc-500 font-mono mt-1">
                {config.escrowAccountId.slice(0, 8)}…
                {config.escrowAccountId.slice(-6)}
              </p>
            </div>

            {/* Progress ring */}
            <div className="relative flex items-center justify-center">
              <ProgressRing value={weight} max={config.threshold} />
              <span className="absolute text-[11px] font-bold text-zinc-200 rotate-[90deg]">
                {weight}/{config.threshold}
              </span>
            </div>
          </div>

          {/* Threshold bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Weight accumulated</span>
              <span>
                {weight} / {config.threshold} required
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  thresholdMet ? "bg-emerald-400" : "bg-amber-400"
                }`}
                style={{
                  width: `${Math.min((weight / config.threshold) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Success state */}
        {released ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-6 text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="h-6 w-6 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="font-semibold text-emerald-300">Funds Released</p>
            <p className="text-xs text-zinc-400">Transaction submitted to Stellar network</p>
          </div>
        ) : (
          <>
            {/* Signers list */}
            <div className="space-y-2">
              {config.signers.map((signer) => {
                const approval = approvals.find(
                  (a) => a.signerAddress === signer.address
                );
                const isConnected =
                  mockMode || connectedAddress === signer.address;

                return (
                  <SignerRow
                    key={signer.address}
                    signer={signer}
                    approval={approval}
                    isConnected={isConnected}
                    onApprove={handleApprove}
                    loading={loading === signer.address}
                  />
                );
              })}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Release button */}
            <button
              onClick={handleRelease}
              disabled={!thresholdMet || loading === "release"}
              className={`
                w-full rounded-xl py-3.5 text-sm font-bold tracking-wide transition-all duration-300
                ${thresholdMet
                  ? "bg-emerald-500 text-black hover:bg-emerald-400 active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                  : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                }
              `}
            >
              {loading === "release"
                ? "Submitting…"
                : thresholdMet
                ? "Release Funds"
                : `${remaining.length} approval${remaining.length !== 1 ? "s" : ""} remaining`}
            </button>

            {/* Mock mode label */}
            {mockMode && (
              <p className="text-center text-xs text-zinc-600">
                Mock mode — no real transactions
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}