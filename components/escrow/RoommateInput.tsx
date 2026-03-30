"use client";

import type { RoommateInputValue } from "./createEscrowForm.helpers";

interface RoommateInputProps {
  roommate: RoommateInputValue;
  index: number;
  onChange: (
    roommateId: string,
    field: "address" | "shareAmount",
    value: string
  ) => void;
  onRemove: (roommateId: string) => void;
  disableRemove: boolean;
}

export default function RoommateInput({
  roommate,
  index,
  onChange,
  onRemove,
  disableRemove,
}: RoommateInputProps) {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-dark-200">Roommate {index + 1}</h3>
        <button
          type="button"
          onClick={() => onRemove(roommate.id)}
          disabled={disableRemove}
          className="text-xs px-3 py-1 rounded-md border border-white/10 text-dark-400 hover:text-dark-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Remove
        </button>
      </div>

      <div className="space-y-2">
        <label className="block text-xs uppercase tracking-wide text-dark-500" htmlFor={`roommate-address-${roommate.id}`}>
          Wallet Address
        </label>
        <input
          id={`roommate-address-${roommate.id}`}
          type="text"
          value={roommate.address}
          onChange={(event) => onChange(roommate.id, "address", event.target.value)}
          placeholder="G..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-dark-100 placeholder:text-dark-600 focus:border-brand-400 focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs uppercase tracking-wide text-dark-500" htmlFor={`roommate-share-${roommate.id}`}>
          Share Amount
        </label>
        <input
          id={`roommate-share-${roommate.id}`}
          type="number"
          min="0"
          step="0.0000001"
          value={roommate.shareAmount}
          onChange={(event) => onChange(roommate.id, "shareAmount", event.target.value)}
          placeholder="0"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-dark-100 placeholder:text-dark-600 focus:border-brand-400 focus:outline-none"
        />
      </div>
    </div>
  );
}
