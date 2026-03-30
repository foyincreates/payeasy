import {
  Account,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Signer {
  address: string;
  role: "landlord" | "roommate";
  weight: number;
}

export interface MultiSigConfig {
  escrowAccountId: string;
  signers: Signer[];
  /** Sum of weights required to authorise a release */
  threshold: number;
  networkPassphrase: string;
}

export interface ApprovalState {
  signerAddress: string;
  approvedAt: Date;
  txSignature: string;
}

export interface EscrowReleaseRequest {
  escrowAccountId: string;
  destinationAddress: string;
  amount: string;
  approvals: ApprovalState[];
  config: MultiSigConfig;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the total weight accumulated from collected approvals.
 */
export function accumulatedWeight(
  approvals: ApprovalState[],
  config: MultiSigConfig
): number {
  return approvals.reduce((acc, approval) => {
    const signer = config.signers.find(
      (s) => s.address === approval.signerAddress
    );
    return acc + (signer?.weight ?? 0);
  }, 0);
}

/**
 * Returns true when collected approvals satisfy the configured threshold.
 */
export function isThresholdMet(
  approvals: ApprovalState[],
  config: MultiSigConfig
): boolean {
  return accumulatedWeight(approvals, config) >= config.threshold;
}

/**
 * Returns signers who haven't approved yet.
 */
export function pendingSigners(
  approvals: ApprovalState[],
  config: MultiSigConfig
): Signer[] {
  const approved = new Set(approvals.map((a) => a.signerAddress));
  return config.signers.filter((s) => !approved.has(s.address));
}

// ─── Transaction helpers ───────────────────────────────────────────────────

/**
 * Build an unsigned payment transaction for the escrow release.
 * Each signer adds their own signature independently.
 */
export async function buildReleaseTransaction(
  params: {
    sourceAccount: Account;
    destination: string;
    amount: string;
    asset?: { code: string; issuer: string } | "native";
    memo?: string;
  },
  config: MultiSigConfig
): Promise<Transaction> {
  const { sourceAccount, destination, amount, asset = "native", memo } = params;

  const op =
    asset === "native"
      ? Operation.payment({
          destination,
          asset: { code: "XLM", issuer: "" } as any, // native XLM
          amount,
        })
      : Operation.payment({
          destination,
          asset: { code: asset.code, issuer: asset.issuer } as any,
          amount,
        });

  let builder = new TransactionBuilder(sourceAccount, {
    fee: "1000",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(300); // 5-min window

  if (memo) builder = builder.addMemo({ value: memo } as any);

  return builder.build();
}

/**
 * Apply a signer's keypair signature to a transaction (returns new tx envelope).
 */
export function applySignature(tx: Transaction, keypair: Keypair): Transaction {
  tx.sign(keypair);
  return tx;
}

/**
 * Merge multiple partially-signed transaction envelopes into one.
 * All envelopes must be for the same transaction hash.
 */
export function mergeSignatures(envelopes: string[]): string {
  if (envelopes.length === 0) throw new Error("No envelopes to merge");

  const [first, ...rest] = envelopes.map((e) =>
    new Transaction(e, Networks.TESTNET)
  );

  for (const tx of rest) {
    for (const sig of tx.signatures) {
      const alreadyPresent = first.signatures.some(
        (s) => s.signature().toString("hex") === sig.signature().toString("hex")
      );
      if (!alreadyPresent) first.signatures.push(sig);
    }
  }

  return first.toEnvelope().toXDR("base64");
}

// ─── On-chain multi-sig configuration ─────────────────────────────────────

/**
 * Build a transaction that configures the escrow account's signers & thresholds.
 * Should be submitted once when the escrow is created.
 */
export function buildMultiSigSetupTransaction(
  sourceAccount: Account,
  config: MultiSigConfig
): Transaction {
  let builder = new TransactionBuilder(sourceAccount, {
    fee: "1000",
    networkPassphrase: config.networkPassphrase,
  });

  // Set thresholds: low/med/high all require the same weight
  builder = builder.addOperation(
    Operation.setOptions({
      lowThreshold: config.threshold,
      medThreshold: config.threshold,
      highThreshold: config.threshold,
    })
  );

  // Add each signer with their configured weight
  for (const signer of config.signers) {
    builder = builder.addOperation(
      Operation.setOptions({
        signer: {
          ed25519PublicKey: signer.address,
          weight: signer.weight,
        },
      })
    );
  }

  return builder.setTimeout(300).build();
}

// ─── Mock helpers (for tests) ─────────────────────────────────────────────

export function mockApproval(signerAddress: string): ApprovalState {
  return {
    signerAddress,
    approvedAt: new Date(),
    txSignature: Buffer.from(
      Array.from({ length: 64 }, () => Math.floor(Math.random() * 256))
    ).toString("hex"),
  };
}

export function defaultTestConfig(overrides?: Partial<MultiSigConfig>): MultiSigConfig {
  return {
    escrowAccountId: "GABC...TEST",
    threshold: 3,
    networkPassphrase: Networks.TESTNET,
    signers: [
      { address: "GLANDLORD111", role: "landlord", weight: 2 },
      { address: "GROOMMATE111", role: "roommate", weight: 1 },
      { address: "GROOMMATE222", role: "roommate", weight: 1 },
    ],
    ...overrides,
  };
}