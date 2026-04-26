"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Save,
} from "lucide-react";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { usePreferences } from "@/hooks/usePreferences";
import type { UserPreferences } from "@/lib/preferences/preferences";

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 ${
          checked ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// ─── Save Feedback Banner ─────────────────────────────────────────────────────

function SaveFeedbackBanner({
  saveStatus,
  saveError,
  onDismiss,
}: {
  saveStatus: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (saveStatus === "saved") {
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus, onDismiss]);

  if (saveStatus === "idle") return null;

  if (saveStatus === "saving") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 px-4 py-3 text-sm text-brand-700 dark:text-brand-300">
        <Loader2 className="w-4 h-4 animate-spin" />
        Saving…
      </div>
    );
  }

  if (saveStatus === "saved") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="w-4 h-4" />
        Settings saved successfully.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {saveError ?? "Failed to save settings. Please try again."}
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-card p-6 space-y-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ─── Input field ─────────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition";

// ─── Budget section ───────────────────────────────────────────────────────────

function BudgetSection({
  prefs,
  update,
}: {
  prefs: UserPreferences;
  update: (fn: (p: UserPreferences) => UserPreferences) => void;
}) {
  return (
    <Section title="Budget">
      <Field label="Currency">
        <select
          value={prefs.budget.currency}
          onChange={(e) =>
            update((p) => ({
              ...p,
              budget: {
                ...p.budget,
                currency: e.target.value as UserPreferences["budget"]["currency"],
              },
            }))
          }
          className={inputClass}
        >
          <option value="USD">USD — US Dollar</option>
          <option value="XLM">XLM — Stellar Lumens</option>
          <option value="USDC">USDC — USD Coin</option>
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Min monthly rent">
          <input
            type="number"
            min={0}
            placeholder="e.g. 500"
            value={prefs.budget.minMonthly ?? ""}
            onChange={(e) =>
              update((p) => ({
                ...p,
                budget: {
                  ...p.budget,
                  minMonthly: e.target.value === "" ? null : Number(e.target.value),
                },
              }))
            }
            className={inputClass}
          />
        </Field>
        <Field label="Max monthly rent">
          <input
            type="number"
            min={0}
            placeholder="e.g. 2000"
            value={prefs.budget.maxMonthly ?? ""}
            onChange={(e) =>
              update((p) => ({
                ...p,
                budget: {
                  ...p.budget,
                  maxMonthly: e.target.value === "" ? null : Number(e.target.value),
                },
              }))
            }
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ["petFriendly", "Pet friendly"],
            ["parking", "Parking"],
            ["laundryInUnit", "In-unit laundry"],
            ["furnished", "Furnished"],
          ] as [keyof UserPreferences["amenities"], string][]
        ).map(([key, label]) => (
          <Toggle
            key={key}
            checked={prefs.amenities[key]}
            label={label}
            onChange={(v) =>
              update((p) => ({
                ...p,
                amenities: { ...p.amenities, [key]: v },
              }))
            }
          />
        ))}
      </div>
    </Section>
  );
}

// ─── Location section ─────────────────────────────────────────────────────────

function LocationSection({
  prefs,
  update,
}: {
  prefs: UserPreferences;
  update: (fn: (p: UserPreferences) => UserPreferences) => void;
}) {
  return (
    <Section title="Location">
      <div className="grid grid-cols-2 gap-4">
        <Field label="City">
          <input
            type="text"
            placeholder="e.g. Austin"
            value={prefs.location.city}
            onChange={(e) =>
              update((p) => ({
                ...p,
                location: { ...p.location, city: e.target.value },
              }))
            }
            className={inputClass}
          />
        </Field>
        <Field label="State / Region">
          <input
            type="text"
            placeholder="e.g. TX"
            value={prefs.location.region}
            onChange={(e) =>
              update((p) => ({
                ...p,
                location: { ...p.location, region: e.target.value },
              }))
            }
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Max commute (minutes)">
        <input
          type="number"
          min={0}
          placeholder="e.g. 30"
          value={prefs.location.maxCommuteMins ?? ""}
          onChange={(e) =>
            update((p) => ({
              ...p,
              location: {
                ...p.location,
                maxCommuteMins: e.target.value === "" ? null : Number(e.target.value),
              },
            }))
          }
          className={`${inputClass} max-w-[180px]`}
        />
      </Field>
    </Section>
  );
}

// ─── Notifications section ────────────────────────────────────────────────────

function NotificationsSection({
  prefs,
  update,
}: {
  prefs: UserPreferences;
  update: (fn: (p: UserPreferences) => UserPreferences) => void;
}) {
  const n = prefs.notifications;
  return (
    <Section title="Notifications">
      <Toggle
        checked={n.escrowContributions}
        label="Contribution alerts"
        description="Notify when a roommate contributes to escrow"
        onChange={(v) =>
          update((p) => ({
            ...p,
            notifications: { ...p.notifications, escrowContributions: v },
          }))
        }
      />
      <Toggle
        checked={n.escrowReleased}
        label="Release alerts"
        description="Notify when rent is released to the landlord"
        onChange={(v) =>
          update((p) => ({
            ...p,
            notifications: { ...p.notifications, escrowReleased: v },
          }))
        }
      />
      <Toggle
        checked={n.deadlineReminders}
        label="Deadline reminders"
        description="Remind before the escrow deadline"
        onChange={(v) =>
          update((p) => ({
            ...p,
            notifications: { ...p.notifications, deadlineReminders: v },
          }))
        }
      />

      {n.deadlineReminders && (
        <Field label="Remind me">
          <select
            value={n.reminderDaysAhead}
            onChange={(e) =>
              update((p) => ({
                ...p,
                notifications: {
                  ...p.notifications,
                  reminderDaysAhead: Number(
                    e.target.value
                  ) as UserPreferences["notifications"]["reminderDaysAhead"],
                },
              }))
            }
            className={`${inputClass} max-w-[220px]`}
          >
            <option value={1}>1 day before deadline</option>
            <option value={3}>3 days before deadline</option>
            <option value={7}>7 days before deadline</option>
            <option value={14}>14 days before deadline</option>
          </select>
        </Field>
      )}
    </Section>
  );
}

// ─── Privacy section ──────────────────────────────────────────────────────────

function PrivacySection({
  prefs,
  update,
}: {
  prefs: UserPreferences;
  update: (fn: (p: UserPreferences) => UserPreferences) => void;
}) {
  const pv = prefs.privacy;
  return (
    <Section title="Privacy">
      <Toggle
        checked={pv.showPublicKeyInProfile}
        label="Show wallet address in profile"
        description="Other users can see your Stellar public key"
        onChange={(v) =>
          update((p) => ({
            ...p,
            privacy: { ...p.privacy, showPublicKeyInProfile: v },
          }))
        }
      />
      <Toggle
        checked={pv.shareActivityWithRoommates}
        label="Share escrow activity with roommates"
        description="Roommates can see your contribution history"
        onChange={(v) =>
          update((p) => ({
            ...p,
            privacy: { ...p.privacy, shareActivityWithRoommates: v },
          }))
        }
      />
      <Toggle
        checked={pv.analyticsOptIn}
        label="Usage analytics"
        description="Help improve PayEasy by sharing anonymous usage data"
        onChange={(v) =>
          update((p) => ({
            ...p,
            privacy: { ...p.privacy, analyticsOptIn: v },
          }))
        }
      />
    </Section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const { isConnected } = useWalletConnection();
  const { preferences, setPreferences, save, reset, saveStatus, saveError } =
    usePreferences();
  const [bannerStatus, setBannerStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [bannerError, setBannerError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected) {
      router.push("/connect");
    }
  }, [isConnected, router]);

  useEffect(() => {
    setBannerStatus(saveStatus);
    setBannerError(saveError);
  }, [saveStatus, saveError]);

  const dismissBanner = useCallback(() => setBannerStatus("idle"), []);

  if (!isConnected) return null;

  return (
    <main aria-label="Account Settings" className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-7 h-7 text-brand-400" />
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Settings
        </h1>
      </div>

      <SaveFeedbackBanner
        saveStatus={bannerStatus}
        saveError={bannerError}
        onDismiss={dismissBanner}
      />

      <BudgetSection prefs={preferences} update={setPreferences} />
      <LocationSection prefs={preferences} update={setPreferences} />
      <NotificationsSection prefs={preferences} update={setPreferences} />
      <PrivacySection prefs={preferences} update={setPreferences} />

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button onClick={save} className="btn-primary !w-full sm:!w-auto flex items-center justify-center gap-2">
          <Save className="w-4 h-4" />
          Save Settings
        </button>
        <button
          onClick={reset}
          className="btn-secondary !w-full sm:!w-auto flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>
    </main>
  );
}
