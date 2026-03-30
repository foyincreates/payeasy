"use client";

import { useEffect } from "react";
import {
  ArrowUpCircle,
  Banknote,
  CheckCircle,
  RefreshCcw,
  X,
} from "lucide-react";

import type {
  EscrowNotification,
  EscrowNotificationType,
} from "../../hooks/useEscrowEvents";

// ─── Style maps ───────────────────────────────────────────────────────────────

const ICONS: Record<EscrowNotificationType, React.ElementType> = {
  contribution: ArrowUpCircle,
  fully_funded: CheckCircle,
  released: Banknote,
  refund_claimed: RefreshCcw,
};

const WRAPPER_CLASSES: Record<EscrowNotificationType, string> = {
  contribution:
    "border-brand-500/40 bg-brand-500/10 text-brand-200",
  fully_funded:
    "border-accent-500/40 bg-accent-500/10 text-accent-200",
  released:
    "border-accent-400/40 bg-accent-400/10 text-accent-100",
  refund_claimed:
    "border-dark-400/40 bg-dark-800/80 text-dark-300",
};

const ICON_CLASSES: Record<EscrowNotificationType, string> = {
  contribution: "text-brand-400",
  fully_funded: "text-accent-400",
  released: "text-accent-300",
  refund_claimed: "text-dark-400",
};

// ─── EscrowToast ──────────────────────────────────────────────────────────────

export interface EscrowToastProps {
  notification: EscrowNotification;
  onDismiss: (id: string) => void;
  /** Auto-dismiss delay in ms. Pass 0 to disable. Defaults to 5 000 ms. */
  autoDismissMs?: number;
}

export function EscrowToast({
  notification,
  onDismiss,
  autoDismissMs = 5_000,
}: EscrowToastProps) {
  useEffect(() => {
    if (!autoDismissMs) return;
    const timer = setTimeout(() => onDismiss(notification.id), autoDismissMs);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss, autoDismissMs]);

  const Icon = ICONS[notification.type];

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg shadow-black/30 animate-fade-in ${WRAPPER_CLASSES[notification.type]}`}
      role="alert"
      aria-live="polite"
    >
      <Icon
        size={20}
        className={`mt-0.5 shrink-0 ${ICON_CLASSES[notification.type]}`}
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">
          {notification.title}
        </p>
        <p className="text-xs opacity-75 mt-0.5 leading-snug">
          {notification.message}
        </p>
      </div>

      <button
        onClick={() => onDismiss(notification.id)}
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity duration-200 -mt-0.5 -mr-0.5 p-0.5 rounded"
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
    </div>
  );
}

// ─── EscrowToastStack ─────────────────────────────────────────────────────────

export interface EscrowToastStackProps {
  notifications: EscrowNotification[];
  onDismiss: (id: string) => void;
  autoDismissMs?: number;
}

/**
 * Renders a fixed-position stack of `EscrowToast` items in the bottom-right
 * corner. Drop this once inside any layout that uses `useEscrowEvents`.
 *
 * @example
 * const { notifications, dismiss } = useEscrowEvents(contractId, { server });
 * return <EscrowToastStack notifications={notifications} onDismiss={dismiss} />;
 */
export function EscrowToastStack({
  notifications,
  onDismiss,
  autoDismissMs,
}: EscrowToastStackProps) {
  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-80 max-w-[calc(100vw-3rem)]"
      aria-label="Escrow notifications"
    >
      {notifications.map((n) => (
        <EscrowToast
          key={n.id}
          notification={n}
          onDismiss={onDismiss}
          autoDismissMs={autoDismissMs}
        />
      ))}
    </div>
  );
}
