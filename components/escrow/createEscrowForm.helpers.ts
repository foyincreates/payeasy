export const MIN_ESCROW_STEP = 1;
export const MAX_ESCROW_STEP = 4;

export interface RoommateInputValue {
  id: string;
  address: string;
  shareAmount: string;
}

export interface EscrowFormDraft {
  totalRent: string;
  tokenId: string;
  deadlineDate: string;
  roommates: RoommateInputValue[];
}

export interface StepValidationResult {
  isValid: boolean;
  errors: string[];
}

const AMOUNT_TOLERANCE = 0.000001;

export function nextEscrowStep(step: number): number {
  return Math.min(MAX_ESCROW_STEP, step + 1);
}

export function previousEscrowStep(step: number): number {
  return Math.max(MIN_ESCROW_STEP, step - 1);
}

export function parsePositiveAmount(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function toLedgerTimestamp(dateValue: string): number | null {
  if (!dateValue) {
    return null;
  }

  const parsed = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return Math.floor(parsed.getTime() / 1000);
}

export function sumRoommateShares(roommates: RoommateInputValue[]): number {
  return roommates.reduce((sum, roommate) => {
    const amount = parsePositiveAmount(roommate.shareAmount);
    return sum + (amount ?? 0);
  }, 0);
}

export function hasExactShareAllocation(
  totalRent: string,
  roommates: RoommateInputValue[]
): boolean {
  const total = parsePositiveAmount(totalRent);
  if (!total) {
    return false;
  }

  return Math.abs(sumRoommateShares(roommates) - total) <= AMOUNT_TOLERANCE;
}

export function validateEscrowStep(
  step: number,
  draft: EscrowFormDraft
): StepValidationResult {
  const errors: string[] = [];

  if (step === 1 || step === 4) {
    const totalRent = parsePositiveAmount(draft.totalRent);
    if (!totalRent) {
      errors.push("Total rent must be greater than zero.");
    }

    if (!draft.tokenId.trim()) {
      errors.push("Select or enter a payment token.");
    }
  }

  if (step === 2 || step === 4) {
    const ledgerTimestamp = toLedgerTimestamp(draft.deadlineDate);
    if (!ledgerTimestamp) {
      errors.push("Set a valid deadline date.");
    }
  }

  if (step === 3 || step === 4) {
    if (!draft.roommates.length) {
      errors.push("Add at least one roommate.");
    }

    for (const roommate of draft.roommates) {
      if (!roommate.address.trim()) {
        errors.push("Each roommate must have an address.");
        break;
      }

      if (!parsePositiveAmount(roommate.shareAmount)) {
        errors.push("Each roommate share must be greater than zero.");
        break;
      }
    }

    if (!hasExactShareAllocation(draft.totalRent, draft.roommates)) {
      errors.push("Roommate share total must equal total rent.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
