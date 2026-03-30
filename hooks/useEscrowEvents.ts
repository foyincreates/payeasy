"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createContractEventPoller,
  type ContractEventPoller,
  type ContributionEvent,
  type AgreementReleasedEvent,
  type ParsedContractEvent,
  type SorobanRpcServer,
} from "../lib/stellar/events.ts";

// ─── Notification types ───────────────────────────────────────────────────────

export type EscrowNotificationType =
  | "contribution"
  | "fully_funded"
  | "released"
  | "refund_claimed";

export interface EscrowNotification {
  id: string;
  type: EscrowNotificationType;
  title: string;
  message: string;
  timestamp: string;
  event: ParsedContractEvent;
}

// ─── Hook options & result ────────────────────────────────────────────────────

export interface UseEscrowEventsOptions {
  server: SorobanRpcServer;
  /** Polling interval in milliseconds. Defaults to 6 000 ms. */
  intervalMs?: number;
  startLedger?: number;
  /** Set to false to suspend polling without unmounting. Defaults to true. */
  enabled?: boolean;
}

export interface UseEscrowEventsResult {
  /** Accumulated list of all parsed contract events seen since mount. */
  events: ParsedContractEvent[];
  /** Pending toast notifications. Grows on new events; shrinks on dismiss. */
  notifications: EscrowNotification[];
  /** Remove a notification from the pending list by id. */
  dismiss: (id: string) => void;
  isPolling: boolean;
  error: string | null;
}

// ─── Pure helpers (exported for testing) ─────────────────────────────────────

const DEFAULT_INTERVAL_MS = 6_000;

/**
 * Converts a single `ParsedContractEvent` into an `EscrowNotification`.
 * Pure function — exported so tests can call it without a React environment.
 */
export function buildNotification(
  event: ParsedContractEvent
): EscrowNotification {
  const id = event.id || `${event.txHash}-${event.ledger}`;

  if (event.type === "Contribution") {
    const e = event as ContributionEvent;
    const short = e.contributor.slice(0, 6) + "\u2026";
    return {
      id,
      type: "contribution",
      title: "New Contribution",
      message: `${short} contributed ${e.amount} stroops`,
      timestamp: e.timestamp,
      event,
    };
  }

  const e = event as AgreementReleasedEvent;
  const short = e.landlord ? e.landlord.slice(0, 6) + "\u2026" : "landlord";
  return {
    id,
    type: "released",
    title: "Rent Released",
    message: `${e.amount} stroops released to ${short}`,
    timestamp: e.timestamp,
    event,
  };
}

/**
 * Runs one poll cycle against the provided poller and converts the results
 * into notifications. Returns the new events and notifications only —
 * callers are responsible for merging with existing state.
 *
 * Pure async function — exported so tests can exercise the polling logic
 * without a React environment.
 */
export async function pollOnce(poller: ContractEventPoller): Promise<{
  events: ParsedContractEvent[];
  notifications: EscrowNotification[];
}> {
  const result = await poller.poll();
  return {
    events: result.events,
    notifications: result.events.map(buildNotification),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEscrowEvents(
  contractId: string,
  options: UseEscrowEventsOptions
): UseEscrowEventsResult {
  const {
    server,
    intervalMs = DEFAULT_INTERVAL_MS,
    startLedger,
    enabled = true,
  } = options;

  const [events, setEvents] = useState<ParsedContractEvent[]>([]);
  const [notifications, setNotifications] = useState<EscrowNotification[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollerRef = useRef<ContractEventPoller | null>(null);

  useEffect(() => {
    if (!enabled || !contractId) return;

    pollerRef.current = createContractEventPoller({
      server,
      contractId,
      startLedger,
    });

    setIsPolling(true);

    const tick = async () => {
      if (!pollerRef.current) return;
      try {
        const { events: newEvents, notifications: newToasts } =
          await pollOnce(pollerRef.current);

        if (newEvents.length > 0) {
          setEvents((prev) => [...prev, ...newEvents]);
          setNotifications((prev) => [...prev, ...newToasts]);
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    void tick();
    const handle = setInterval(tick, intervalMs);

    return () => {
      clearInterval(handle);
      pollerRef.current = null;
      setIsPolling(false);
    };
  }, [contractId, server, intervalMs, startLedger, enabled]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { events, notifications, dismiss, isPolling, error };
}
