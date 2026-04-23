import {
  Account,
  Asset,
  BASE_FEE,
  Keypair,
  Memo,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

export type MultiSigRole = "landlord" | "roommate";

export interface Signer {
  address: string;
  role: MultiSigRole;
  weight: number;
}

export interface MultiSigConfig {
  escrowAccountId: string;
  signers: Signer[];
  threshold: number;
  networkPassphrase: string;
  requireLandlordApproval?: boolean;
  roommateApprovalThreshold?: number;
}

export interface ApprovalState {
  signerAddress: string;
  approvedAt: Date;
  signedTransactionXdr: string;
}

export interface EscrowReleaseRequest {
  escrowAccountId: string;
  destinationAddress: string;
  amount: string;
  approvals: ApprovalState[];
  config: MultiSigConfig;
}

export type WalletSignTransaction = (
  xdr: string,
  options: { network?: string; networkPassphrase: string }
) => Promise<string | { signedTxXdr?: string; txXdr?: string; error?: unknown }>;

export interface CreateLandlordMajorityConfigParams {
  escrowAccountId: string;
  landlordAddress: string;
  roommateAddresses: string[];
  networkPassphrase?: string;
  roommateWeight?: number;
  landlordWeight?: number;
  threshold?: number;
}

export interface ApproveReleaseParams {
  signerAddress: string;
  transactionXdr: string;
  config: MultiSigConfig;
  signTransaction: WalletSignTransaction;
  network?: string;
  now?: Date;
}

export interface MultiSigSetupOptions {
  masterWeight?: number;
  lowThreshold?: number;
  medThreshold?: number;
  highThreshold?: number;
}

function uniqueByAddress(signers: Signer[]): Signer[] {
  const seen = new Set<string>();
  const result: Signer[] = [];

  for (const signer of signers) {
    if (seen.has(signer.address)) continue;
    seen.add(signer.address);
    result.push(signer);
  }

  return result;
}

function approvedAddressSet(approvals: ApprovalState[]): Set<string> {
  return new Set(approvals.map((approval) => approval.signerAddress));
}

function normalizeSignedXdr(
  response: Awaited<ReturnType<WalletSignTransaction>>
): string {
  if (typeof response === "string") {
    return response;
  }

  if (response.error) {
    throw new Error(String(response.error));
  }

  const signedXdr = response.signedTxXdr ?? response.txXdr;
  if (!signedXdr) {
    throw new Error("Wallet did not return a signed transaction XDR.");
  }

  return signedXdr;
}

function assertValidConfig(config: MultiSigConfig): void {
  if (!config.escrowAccountId) {
    throw new Error("Escrow account ID is required.");
  }

  if (!Number.isInteger(config.threshold) || config.threshold < 1) {
    throw new Error("Multi-sig threshold must be a positive integer.");
  }

  if (config.signers.length === 0) {
    throw new Error("At least one signer is required.");
  }

  const addresses = new Set<string>();
  for (const signer of config.signers) {
    if (!signer.address) {
      throw new Error("Signer address is required.");
    }

    if (addresses.has(signer.address)) {
      throw new Error(`Duplicate signer configured: ${signer.address}`);
    }

    if (!Number.isInteger(signer.weight) || signer.weight < 1) {
      throw new Error(`Signer ${signer.address} must have a positive integer weight.`);
    }

    addresses.add(signer.address);
  }

  const totalWeight = config.signers.reduce((sum, signer) => sum + signer.weight, 0);
  if (config.threshold > totalWeight) {
    throw new Error("Multi-sig threshold cannot exceed total signer weight.");
  }
}

export function roommateMajorityThreshold(roommateCount: number): number {
  if (roommateCount <= 0) {
    return 0;
  }

  return Math.floor(roommateCount / 2) + 1;
}

export function createLandlordMajorityConfig(
  params: CreateLandlordMajorityConfigParams
): MultiSigConfig {
  const roommateWeight = params.roommateWeight ?? 1;
  const roommateApprovalThreshold = roommateMajorityThreshold(
    params.roommateAddresses.length
  );
  const landlordWeight =
    params.landlordWeight ?? params.roommateAddresses.length * roommateWeight + 1;
  const requiredThreshold =
    landlordWeight + roommateApprovalThreshold * roommateWeight;

  const config: MultiSigConfig = {
    escrowAccountId: params.escrowAccountId,
    networkPassphrase: params.networkPassphrase ?? Networks.TESTNET,
    threshold: params.threshold ?? requiredThreshold,
    requireLandlordApproval: true,
    roommateApprovalThreshold,
    signers: [
      {
        address: params.landlordAddress,
        role: "landlord",
        weight: landlordWeight,
      },
      ...params.roommateAddresses.map((address) => ({
        address,
        role: "roommate" as const,
        weight: roommateWeight,
      })),
    ],
  };

  assertValidConfig(config);
  return config;
}

export function accumulatedWeight(
  approvals: ApprovalState[],
  config: MultiSigConfig
): number {
  const approved = approvedAddressSet(approvals);

  return uniqueByAddress(config.signers).reduce((sum, signer) => {
    return sum + (approved.has(signer.address) ? signer.weight : 0);
  }, 0);
}

export function isThresholdMet(
  approvals: ApprovalState[],
  config: MultiSigConfig
): boolean {
  return accumulatedWeight(approvals, config) >= config.threshold;
}

export function approvedRoommateCount(
  approvals: ApprovalState[],
  config: MultiSigConfig
): number {
  const approved = approvedAddressSet(approvals);
  return config.signers.filter(
    (signer) => signer.role === "roommate" && approved.has(signer.address)
  ).length;
}

export function hasLandlordApproval(
  approvals: ApprovalState[],
  config: MultiSigConfig
): boolean {
  const approved = approvedAddressSet(approvals);
  return config.signers.some(
    (signer) => signer.role === "landlord" && approved.has(signer.address)
  );
}

export function requiredRoommateApprovals(config: MultiSigConfig): number {
  if (typeof config.roommateApprovalThreshold === "number") {
    return config.roommateApprovalThreshold;
  }

  const roommateCount = config.signers.filter(
    (signer) => signer.role === "roommate"
  ).length;
  return roommateMajorityThreshold(roommateCount);
}

export function isReleaseApproved(
  approvals: ApprovalState[],
  config: MultiSigConfig
): boolean {
  const landlordSatisfied =
    config.requireLandlordApproval === false || hasLandlordApproval(approvals, config);
  const roommateSatisfied =
    approvedRoommateCount(approvals, config) >= requiredRoommateApprovals(config);

  return landlordSatisfied && roommateSatisfied && isThresholdMet(approvals, config);
}

export function pendingSigners(
  approvals: ApprovalState[],
  config: MultiSigConfig
): Signer[] {
  const approved = approvedAddressSet(approvals);
  return config.signers.filter((signer) => !approved.has(signer.address));
}

export async function approveRelease(
  params: ApproveReleaseParams
): Promise<ApprovalState> {
  const signer = params.config.signers.find(
    (candidate) => candidate.address === params.signerAddress
  );

  if (!signer) {
    throw new Error("Connected wallet is not a configured release signer.");
  }

  const signedResponse = await params.signTransaction(params.transactionXdr, {
    network: params.network,
    networkPassphrase: params.config.networkPassphrase,
  });

  return {
    signerAddress: signer.address,
    approvedAt: params.now ?? new Date(),
    signedTransactionXdr: normalizeSignedXdr(signedResponse),
  };
}

export function mergeSignatures(
  envelopes: string[],
  networkPassphrase: string = Networks.TESTNET
): string {
  if (envelopes.length === 0) {
    throw new Error("No signed envelopes to merge.");
  }

  const transactions = envelopes.map((envelope) =>
    TransactionBuilder.fromXDR(envelope, networkPassphrase)
  );

  const [first, ...rest] = transactions;
  if (!(first instanceof Transaction)) {
    throw new Error("Fee-bump transactions are not supported for multi-sig merging.");
  }

  const expectedHash = first.hash().toString("hex");

  for (const transaction of rest) {
    if (!(transaction instanceof Transaction)) {
      throw new Error("Fee-bump transactions are not supported for multi-sig merging.");
    }

    const hash = transaction.hash().toString("hex");
    if (hash !== expectedHash) {
      throw new Error("Cannot merge signatures from different transactions.");
    }

    for (const signature of transaction.signatures) {
      const duplicate = first.signatures.some(
        (existing) =>
          existing.hint().toString("hex") === signature.hint().toString("hex") &&
          existing.signature().toString("hex") === signature.signature().toString("hex")
      );

      if (!duplicate) {
        first.signatures.push(signature);
      }
    }
  }

  return first.toEnvelope().toXDR("base64");
}

export function mergeApprovalSignatures(
  approvals: ApprovalState[],
  config: MultiSigConfig
): string {
  if (!isReleaseApproved(approvals, config)) {
    throw new Error("Release approval threshold has not been met.");
  }

  return mergeSignatures(
    approvals.map((approval) => approval.signedTransactionXdr),
    config.networkPassphrase
  );
}

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
  const paymentAsset =
    asset === "native" ? Asset.native() : new Asset(asset.code, asset.issuer);

  let builder = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  }).addOperation(
    Operation.payment({
      destination,
      asset: paymentAsset,
      amount,
    })
  );

  if (memo) {
    builder = builder.addMemo(Memo.text(memo));
  }

  return builder.setTimeout(300).build();
}

export function applySignature(tx: Transaction, keypair: Keypair): Transaction {
  tx.sign(keypair);
  return tx;
}

export function buildMultiSigSetupTransaction(
  sourceAccount: Account,
  config: MultiSigConfig,
  options: MultiSigSetupOptions = {}
): Transaction {
  assertValidConfig(config);

  let builder = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  });

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

  builder = builder.addOperation(
    Operation.setOptions({
      masterWeight: options.masterWeight ?? 0,
      lowThreshold: options.lowThreshold ?? config.threshold,
      medThreshold: options.medThreshold ?? config.threshold,
      highThreshold: options.highThreshold ?? config.threshold,
    })
  );

  return builder.setTimeout(300).build();
}

export function mockApproval(
  signerAddress: string,
  signedTransactionXdr = `mock-signed-xdr:${signerAddress}:${Date.now()}`
): ApprovalState {
  return {
    signerAddress,
    approvedAt: new Date(),
    signedTransactionXdr,
  };
}

export function defaultTestConfig(
  overrides?: Partial<MultiSigConfig>
): MultiSigConfig {
  return {
    escrowAccountId: "GESCROWACCOUNT",
    threshold: 6,
    networkPassphrase: Networks.TESTNET,
    requireLandlordApproval: true,
    roommateApprovalThreshold: 2,
    signers: [
      { address: "GLANDLORD111", role: "landlord", weight: 4 },
      { address: "GROOMMATE111", role: "roommate", weight: 1 },
      { address: "GROOMMATE222", role: "roommate", weight: 1 },
      { address: "GROOMMATE333", role: "roommate", weight: 1 },
    ],
    ...overrides,
  };
}
