"use client";

import { useMemo, useState } from "react";

import { getExplorerLink, type ExplorerProvider } from "@/lib/stellar/explorer";

import RoommateInput from "./RoommateInput";
import {
  hasExactShareAllocation,
  nextEscrowStep,
  previousEscrowStep,
  sumRoommateShares,
  toLedgerTimestamp,
  validateEscrowStep,
  type EscrowFormDraft,
  type RoommateInputValue,
} from "./createEscrowForm.helpers";

interface InitializeEscrowParams {
  totalRent: string;
  tokenId: string;
  deadlineLedgerTimestamp: number;
}

interface AddRoommateParams {
  roommateAddress: string;
  shareAmount: string;
}

interface ContractInvocationMetadata {
  transactionHash?: string;
  contractId?: string;
}

type ContractInvocationResult = string | ContractInvocationMetadata | undefined;

export interface EscrowContractClient {
  initialize(params: InitializeEscrowParams): Promise<ContractInvocationResult>;
  add_roommate?: (params: AddRoommateParams) => Promise<ContractInvocationResult>;
  addRoommate?: (params: AddRoommateParams) => Promise<ContractInvocationResult>;
}

interface SubmissionState {
  transactionHash?: string;
  contractId?: string;
}

interface CreateEscrowFormProps {
  contractClient?: EscrowContractClient;
  explorer?: ExplorerProvider;
}

const STEP_LABELS = [
  "Rent & Token",
  "Deadline",
  "Roommates",
  "Review",
] as const;

const DEFAULT_EXPLORER: ExplorerProvider = "stellar.expert";

function createRoommate(): RoommateInputValue {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    address: "",
    shareAmount: "",
  };
}

const DEMO_CONTRACT_CLIENT: EscrowContractClient = {
  async initialize() {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return {
      transactionHash: "DEMO_TX_HASH",
      contractId: "DEMO_CONTRACT_ID",
    };
  },
  async add_roommate() {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      transactionHash: "DEMO_TX_HASH",
    };
  },
};

function metadataFromResult(value: ContractInvocationResult): ContractInvocationMetadata {
  if (!value) {
    return {};
  }

  if (typeof value === "string") {
    return {
      transactionHash: value,
    };
  }

  const transactionHash =
    value.transactionHash ??
    ("txHash" in value && typeof value.txHash === "string" ? value.txHash : undefined) ??
    ("hash" in value && typeof value.hash === "string" ? value.hash : undefined);

  const contractId =
    value.contractId ??
    ("id" in value && typeof value.id === "string" ? value.id : undefined);

  return {
    ...(transactionHash ? { transactionHash } : {}),
    ...(contractId ? { contractId } : {}),
  };
}

export default function CreateEscrowForm({
  contractClient,
  explorer = DEFAULT_EXPLORER,
}: CreateEscrowFormProps) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<EscrowFormDraft>({
    totalRent: "",
    tokenId: "",
    deadlineDate: "",
    roommates: [createRoommate()],
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState<SubmissionState | null>(null);

  const totalRoommateShares = useMemo(
    () => sumRoommateShares(draft.roommates),
    [draft.roommates]
  );
  const sharesMatchTotal = useMemo(
    () => hasExactShareAllocation(draft.totalRent, draft.roommates),
    [draft.totalRent, draft.roommates]
  );
  const deadlineLedgerTimestamp = useMemo(
    () => toLedgerTimestamp(draft.deadlineDate),
    [draft.deadlineDate]
  );

  const currentStepLabel = STEP_LABELS[step - 1];

  function handleRoommateChange(
    roommateId: string,
    field: "address" | "shareAmount",
    value: string
  ): void {
    setDraft((current) => ({
      ...current,
      roommates: current.roommates.map((roommate) =>
        roommate.id === roommateId ? { ...roommate, [field]: value } : roommate
      ),
    }));
  }

  function handleRoommateRemove(roommateId: string): void {
    setDraft((current) => {
      if (current.roommates.length <= 1) {
        return current;
      }

      return {
        ...current,
        roommates: current.roommates.filter((roommate) => roommate.id !== roommateId),
      };
    });
  }

  function handleNext(): void {
    const validation = validateEscrowStep(step, draft);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    setStep((current) => nextEscrowStep(current));
  }

  function handleBack(): void {
    setErrors([]);
    setStep((current) => previousEscrowStep(current));
  }

  async function handleConfirm(): Promise<void> {
    const validation = validateEscrowStep(4, draft);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    if (!deadlineLedgerTimestamp) {
      setErrors(["Set a valid deadline date."]);
      return;
    }

    const activeClient = contractClient ?? DEMO_CONTRACT_CLIENT;
    const addRoommateMethod =
      activeClient.add_roommate ?? activeClient.addRoommate;

    if (!addRoommateMethod) {
      setErrors(["Contract client is missing add_roommate/addRoommate method."]);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors([]);

      const initializeResult = await activeClient.initialize({
        totalRent: draft.totalRent,
        tokenId: draft.tokenId.trim(),
        deadlineLedgerTimestamp,
      });

      let lastMetadata = metadataFromResult(initializeResult);

      for (const roommate of draft.roommates) {
        const addRoommateResult = await addRoommateMethod({
          roommateAddress: roommate.address.trim(),
          shareAmount: roommate.shareAmount,
        });

        const roommateMetadata = metadataFromResult(addRoommateResult);
        lastMetadata = {
          ...lastMetadata,
          ...roommateMetadata,
        };
      }

      setSubmission({
        transactionHash: lastMetadata.transactionHash,
        contractId: lastMetadata.contractId,
      });
      setStep(4);
    } catch (error) {
      setErrors([
        error instanceof Error
          ? error.message
          : "Escrow creation failed. Please try again.",
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="max-w-3xl mx-auto rounded-3xl glass p-6 sm:p-8">
      <header className="mb-6 space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-300">
          Escrow Setup
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-100">
          Create Rent Escrow Agreement
        </h1>
        <p className="text-sm text-dark-500">
          Step {step} of 4: {currentStepLabel}
        </p>
      </header>

      <div className="mb-8 grid grid-cols-4 gap-2">
        {STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1;
          const isComplete = stepNumber < step;
          const isCurrent = stepNumber === step;

          return (
            <div
              key={label}
              className={`rounded-xl border px-3 py-2 text-center text-xs sm:text-sm ${
                isCurrent
                  ? "border-brand-400 bg-brand-500/20 text-brand-100"
                  : isComplete
                    ? "border-accent-400/60 bg-accent-500/15 text-accent-100"
                    : "border-white/10 bg-white/5 text-dark-500"
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>

      {errors.length > 0 ? (
        <div className="mb-6 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          {errors.join(" ")}
        </div>
      ) : null}

      <div className="space-y-6">
        {step === 1 ? (
          <>
            <div className="space-y-2">
              <label htmlFor="total-rent" className="block text-sm text-dark-400">
                Total Rent Amount
              </label>
              <input
                id="total-rent"
                type="number"
                min="0"
                step="0.0000001"
                value={draft.totalRent}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    totalRent: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-dark-100 focus:border-brand-400 focus:outline-none"
                placeholder="e.g. 1250"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="token-id" className="block text-sm text-dark-400">
                Payment Token
              </label>
              <input
                id="token-id"
                list="token-options"
                value={draft.tokenId}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    tokenId: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-dark-100 focus:border-brand-400 focus:outline-none"
                placeholder="XLM or contract ID"
              />
              <datalist id="token-options">
                <option value="XLM" />
                <option value="USDC" />
                <option value="TEST:ISSUER" />
              </datalist>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <div className="space-y-2">
            <label htmlFor="deadline-date" className="block text-sm text-dark-400">
              Escrow Deadline
            </label>
            <input
              id="deadline-date"
              type="date"
              value={draft.deadlineDate}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  deadlineDate: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-dark-100 focus:border-brand-400 focus:outline-none"
            />
            <p className="text-sm text-dark-500">
              Ledger timestamp: {deadlineLedgerTimestamp ?? "-"}
            </p>
          </div>
        ) : null}

        {step === 3 ? (
          <>
            <div className="space-y-4">
              {draft.roommates.map((roommate, index) => (
                <RoommateInput
                  key={roommate.id}
                  roommate={roommate}
                  index={index}
                  onChange={handleRoommateChange}
                  onRemove={handleRoommateRemove}
                  disableRemove={draft.roommates.length === 1}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  roommates: [...current.roommates, createRoommate()],
                }))
              }
              className="btn-secondary !px-4 !py-2 !text-sm"
            >
              Add Roommate
            </button>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-dark-400 space-y-1">
              <p>Total rent: {draft.totalRent || "0"}</p>
              <p>Total roommate shares: {totalRoommateShares.toFixed(7).replace(/\.0+$/, "")}</p>
              <p className={sharesMatchTotal ? "text-accent-300" : "text-red-300"}>
                {sharesMatchTotal
                  ? "Share allocation is valid."
                  : "Share allocation must exactly match total rent."}
              </p>
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-dark-300">
            <p>
              <span className="text-dark-500">Total rent:</span> {draft.totalRent}
            </p>
            <p>
              <span className="text-dark-500">Payment token:</span> {draft.tokenId}
            </p>
            <p>
              <span className="text-dark-500">Deadline date:</span> {draft.deadlineDate}
            </p>
            <p>
              <span className="text-dark-500">Deadline ledger timestamp:</span>{" "}
              {deadlineLedgerTimestamp ?? "-"}
            </p>
            <div>
              <p className="text-dark-500 mb-2">Roommates:</p>
              <ul className="space-y-1">
                {draft.roommates.map((roommate) => (
                  <li key={roommate.id} className="font-mono text-xs sm:text-sm text-dark-200">
                    {roommate.address} - {roommate.shareAmount}
                  </li>
                ))}
              </ul>
            </div>

            {submission ? (
              <div className="rounded-xl border border-accent-500/40 bg-accent-500/10 p-4 text-accent-100 space-y-2">
                <p>Escrow agreement submitted.</p>
                {submission.transactionHash ? (
                  <a
                    href={getExplorerLink("transaction", submission.transactionHash, { explorer })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block underline decoration-accent-300/70 underline-offset-2"
                  >
                    View transaction on explorer
                  </a>
                ) : null}
                {submission.contractId ? (
                  <a
                    href={getExplorerLink("contract", submission.contractId, { explorer })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block underline decoration-accent-300/70 underline-offset-2"
                  >
                    View contract on explorer
                  </a>
                ) : null}
              </div>
            ) : null}

            {!contractClient ? (
              <p className="text-xs text-dark-600">
                Demo mode is active. Pass a real contract client to execute on-chain transactions.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <footer className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1 || isSubmitting}
          className="btn-secondary !px-4 !py-2 !text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Back
        </button>

        {step < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            className="btn-primary !px-5 !py-2.5 !text-sm"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isSubmitting}
            className="btn-primary !px-5 !py-2.5 !text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Create Escrow"}
          </button>
        )}
      </footer>
    </section>
  );
}
