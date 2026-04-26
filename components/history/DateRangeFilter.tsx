"use client";

import { CalendarDays, X } from "lucide-react";

interface DateRangeFilterProps {
  /** Start of the date range (ISO "YYYY-MM-DD" or empty) */
  from: string;
  /** End of the date range (ISO "YYYY-MM-DD" or empty) */
  to: string;
  /** Called when the "From" date changes */
  onFromChange: (value: string) => void;
  /** Called when the "To" date changes */
  onToChange: (value: string) => void;
  /** Called when the user clicks "Clear" */
  onClear: () => void;
  /** Count of transactions visible after filtering */
  filteredCount: number;
  /** Total count of transactions before filtering */
  totalCount: number;
}

/**
 * A date range filter UI for the history page.
 *
 * Renders two native `mm/dd/yyyy` date inputs ("From" and "To"), a "Clear"
 * button that resets both fields, and a result count badge.
 */
export default function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  onClear,
  filteredCount,
  totalCount,
}: DateRangeFilterProps) {
  const isActive = from !== "" || to !== "";

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
      {/* From field */}
      <div className="relative flex items-center flex-1 min-w-0">
        <label htmlFor="date-from" className="sr-only">
          From date
        </label>
        <span
          className="pointer-events-none absolute left-3 text-dark-500"
          aria-hidden="true"
        >
          <CalendarDays size={16} />
        </span>
        <input
          id="date-from"
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          max={to || undefined}
          aria-label="From date"
          data-testid="date-range-from"
          className="w-full bg-dark-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-sm text-dark-100 placeholder:text-dark-600 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium [color-scheme:dark]"
        />
      </div>

      {/* Separator */}
      <span className="hidden sm:block text-dark-600 text-xs font-bold select-none">
        –
      </span>

      {/* To field */}
      <div className="relative flex items-center flex-1 min-w-0">
        <label htmlFor="date-to" className="sr-only">
          To date
        </label>
        <span
          className="pointer-events-none absolute left-3 text-dark-500"
          aria-hidden="true"
        >
          <CalendarDays size={16} />
        </span>
        <input
          id="date-to"
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          min={from || undefined}
          aria-label="To date"
          data-testid="date-range-to"
          className="w-full bg-dark-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-sm text-dark-100 placeholder:text-dark-600 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium [color-scheme:dark]"
        />
      </div>

      {/* Clear button */}
      {isActive && (
        <button
          type="button"
          onClick={onClear}
          data-testid="date-range-clear"
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-dark-300 bg-white/5 border border-white/10 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/20 transition-all active:scale-95 whitespace-nowrap"
        >
          <X size={14} />
          Clear
        </button>
      )}

      {/* Result count badge */}
      {isActive && (
        <div
          data-testid="date-range-count"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-[11px] font-black text-brand-300 uppercase tracking-wider whitespace-nowrap"
        >
          Showing{" "}
          <span className="text-white">{filteredCount}</span> of{" "}
          <span className="text-white">{totalCount}</span> transactions
        </div>
      )}
    </div>
  );
}
