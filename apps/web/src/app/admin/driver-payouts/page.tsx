// @ts-nocheck
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
  Wallet,
  Banknote,
  Settings,
  ChevronRight,
  Check,
  AlertTriangle,
  Trash2,
  Plus,
  Database,
  Scale,
  Landmark,
} from "lucide-react";

type ReadyDriver = {
  driverId: string;
  driver: { id: string; driverId: string; name: string; email: string; vehicle: string } | null;
  count: number;
  total: number;
};

type PayoutEarning = {
  id: string;
  bookingId: string;
  driverNet: number;
  commissionPct: number;
  platformFee: number;
  needsReview: boolean;
  mode: string;
  completedAt: string;
};

type Payout = {
  id: string;
  driverId: string;
  amount: number;
  method: string;
  reference: string | null;
  status: "DRAFT" | "PAID" | "CANCELLED" | string;
  notes: string | null;
  idempotencyKey: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  driver: { id: string; driverId: string; name: string; email: string; vehicle: string };
  earnings: PayoutEarning[];
};

type Summary = {
  draft: { count: number; total: number };
  paid: { count: number; total: number };
};

type SettingsDriver = {
  id: string;
  driverId: string;
  name: string;
  email: string;
  vehicle: string;
  commissionPctOverride: number | null;
  payoutNotes: string | null;
};

type AdjustmentRow = {
  id: string;
  driverId: string;
  amount: number;
  reason: string;
  notes: string | null;
  earningId: string | null;
  payoutId: string | null;
  createdAt: string;
  driver: { id: string; driverId: string; name: string; email: string; vehicle: string };
  payout: { id: string; status: string; amount: number; paidAt: string | null } | null;
};

type ConnectDriverRow = {
  id: string;
  driverId: string;
  name: string;
  email: string;
  vehicle: string;
  stripeConnectAccountId: string | null;
  stripeConnectStatus: string;
  stripeConnectUpdatedAt: string | null;
};

type PaySettings = {
  id: string;
  defaultPlatformCommissionPercent: number;
  payoutCurrency: string;
  updatedAt: string;
};

function money(n: number | null | undefined) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return `$${n.toFixed(2)}`;
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function makeIdemKey() {
  return `markpaid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function AdminDriverPayoutsPage() {
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ready, setReady] = useState<ReadyDriver[]>([]);
  const [tab, setTab] = useState<"draft" | "paid" | "cancelled" | "all">("draft");
  const [actionBusy, setActionBusy] = useState(false);

  // Settings panel
  const [settings, setSettings] = useState<PaySettings | null>(null);
  const [settingsDrivers, setSettingsDrivers] = useState<SettingsDriver[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [defaultPct, setDefaultPct] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [backfillStats, setBackfillStats] = useState<any>(null);

  // Modals
  const [createOpen, setCreateOpen] = useState<ReadyDriver | null>(null);
  const [payOpen, setPayOpen] = useState<Payout | null>(null);
  const [cancelOpen, setCancelOpen] = useState<Payout | null>(null);

  // Phase 2 — Adjustments + Connect status
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([]);
  const [adjSummary, setAdjSummary] = useState<{ positive: number; negative: number; net: number } | null>(null);
  const [adjustmentsBusy, setAdjustmentsBusy] = useState(false);
  const [adjForm, setAdjForm] = useState<{ driverId: string; amount: string; reason: string; notes: string }>({
    driverId: "",
    amount: "",
    reason: "BONUS",
    notes: "",
  });
  const [connectRows, setConnectRows] = useState<ConnectDriverRow[]>([]);
  const [connectInfo, setConnectInfo] = useState<{ available: boolean; payoutsLive: boolean } | null>(null);
  const [connectBusyDriver, setConnectBusyDriver] = useState<string | null>(null);

  const loadPayouts = useCallback(async () => {
    try {
      setRefreshing(true);
      setError("");
      const params = new URLSearchParams();
      if (tab !== "all") params.set("status", tab.toUpperCase());
      const res = await fetch(`/api/admin/driver-payouts?${params}`, { credentials: "include" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to load payouts");
        return;
      }
      setPayouts(data.payouts || []);
      setSummary(data.summary || null);
      setReady(data.ready || []);
    } catch {
      setError("Failed to connect to server");
    } finally {
      setRefreshing(false);
      setInitialLoad(false);
    }
  }, [tab]);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/driver-pay-settings", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setSettingsDrivers(data.drivers || []);
        setDefaultPct(String(data.settings.defaultPlatformCommissionPercent));
      }
    } catch {
      /* silent */
    }
  }, []);

  const loadAdjustments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/driver-adjustments?limit=50", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setAdjustments(data.adjustments || []);
        setAdjSummary({
          positive: data.summary?.positive?.total ?? 0,
          negative: data.summary?.negative?.total ?? 0,
          net: data.summary?.net ?? 0,
        });
      }
    } catch {
      /* silent */
    }
  }, []);

  const loadConnect = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/driver-connect", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setConnectRows(data.drivers || []);
        setConnectInfo({ available: !!data.connectAvailable, payoutsLive: !!data.payoutsLive });
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    void loadPayouts();
  }, [loadPayouts]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadAdjustments();
    void loadConnect();
  }, [loadAdjustments, loadConnect]);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const driverOverrides: Array<{ driverId: string; commissionPctOverride: number | null }> = [];
      for (const [driverId, raw] of Object.entries(overrides)) {
        if (raw === undefined) continue;
        const trimmed = raw.trim();
        if (trimmed === "") {
          driverOverrides.push({ driverId, commissionPctOverride: null });
        } else {
          const n = Number(trimmed);
          if (Number.isFinite(n)) driverOverrides.push({ driverId, commissionPctOverride: n });
        }
      }

      const body: Record<string, unknown> = {};
      const pctN = Number(defaultPct);
      if (Number.isFinite(pctN)) body.defaultPlatformCommissionPercent = pctN;
      if (driverOverrides.length > 0) body.driverOverrides = driverOverrides;

      const res = await fetch("/api/admin/driver-pay-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to save settings");
        return;
      }
      setOverrides({});
      await loadSettings();
    } finally {
      setSavingSettings(false);
    }
  };

  const runBackfill = async (dryRun: boolean) => {
    setBackfillBusy(true);
    try {
      const res = await fetch("/api/admin/driver-pay-settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun, chunkSize: 100 }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Backfill failed");
        return;
      }
      setBackfillStats(data.stats);
      if (!dryRun) await loadPayouts();
    } finally {
      setBackfillBusy(false);
    }
  };

  const createBatch = async (driverId: string, method: string, reference: string, notes: string) => {
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/driver-payouts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", driverId, method, reference, notes }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to create batch");
        return;
      }
      setCreateOpen(null);
      setTab("draft");
      await loadPayouts();
    } finally {
      setActionBusy(false);
    }
  };

  const markPaid = async (
    payout: Payout,
    method: string,
    reference: string,
    notes: string,
    viaConnect: boolean
  ) => {
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/driver-payouts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "markPaid",
          payoutId: payout.id,
          expectedAmount: payout.amount,
          idempotencyKey: makeIdemKey(),
          method,
          reference,
          notes,
          viaConnect,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to mark paid");
        if (data.code === "AMOUNT_MISMATCH") {
          await loadPayouts();
        }
        return;
      }
      if (viaConnect && !data.stripeTransferId) {
        alert(
          "Payout marked PAID but Stripe Transfer could not be created. Check the batch notes and the driver's Connect status."
        );
      }
      setPayOpen(null);
      await loadPayouts();
    } finally {
      setActionBusy(false);
    }
  };

  const submitAdjustment = async () => {
    if (!adjForm.driverId || !adjForm.amount.trim()) {
      alert("Pick a driver and enter an amount (negative = deduction)");
      return;
    }
    const amount = Number(adjForm.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      alert("Amount must be a non-zero number");
      return;
    }
    setAdjustmentsBusy(true);
    try {
      const res = await fetch("/api/admin/driver-adjustments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: adjForm.driverId,
          amount,
          reason: adjForm.reason,
          notes: adjForm.notes,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to create adjustment");
        return;
      }
      setAdjForm({ driverId: "", amount: "", reason: "BONUS", notes: "" });
      await loadAdjustments();
    } finally {
      setAdjustmentsBusy(false);
    }
  };

  const deleteAdjustment = async (id: string) => {
    if (!confirm("Delete this adjustment? Only works for rows not yet attached to a PAID payout.")) return;
    try {
      const res = await fetch(`/api/admin/driver-adjustments?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to delete");
        return;
      }
      await loadAdjustments();
    } catch {
      alert("Failed to delete");
    }
  };

  const startConnectForDriver = async (driverId: string) => {
    setConnectBusyDriver(driverId);
    try {
      const res = await fetch("/api/admin/driver-connect", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId, action: "onboard" }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to start onboarding");
        return;
      }
      if (data.url) {
        window.open(data.url, "_blank", "noopener");
      }
      await loadConnect();
    } finally {
      setConnectBusyDriver(null);
    }
  };

  const refreshConnectForDriver = async (driverId: string) => {
    setConnectBusyDriver(driverId);
    try {
      const res = await fetch("/api/admin/driver-connect", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId, action: "refresh" }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to refresh status");
        return;
      }
      await loadConnect();
    } finally {
      setConnectBusyDriver(null);
    }
  };

  const cancelBatch = async (payout: Payout, reason: string) => {
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/driver-payouts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", payoutId: payout.id, reason }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to cancel");
        return;
      }
      setCancelOpen(null);
      await loadPayouts();
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1500px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
            Driver Payouts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Admin batch control. Create a DRAFT batch, verify, and Mark Paid once Interac / EFT /
            cheque clears.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              showSettings
                ? "bg-[#C9A063] text-[#1a1a1a]"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            type="button"
            onClick={() => void loadPayouts()}
            disabled={refreshing || initialLoad}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {showSettings ? (
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 mb-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Pay settings</h2>
          <p className="text-xs text-gray-500 mb-4">
            Global platform commission applies when a driver has no override. Audit log records
            every change.
          </p>
          <div className="flex items-end gap-3 mb-5">
            <label className="text-xs text-gray-600 flex flex-col gap-1">
              Default platform commission %
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={defaultPct}
                onChange={(e) => setDefaultPct(e.target.value)}
                className="px-3 py-2 w-40 rounded-md border border-gray-200 text-sm"
              />
            </label>
            <div className="text-xs text-gray-500">
              Payout currency: <span className="font-semibold">{settings?.payoutCurrency || "CAD"}</span>
            </div>
            <button
              type="button"
              disabled={savingSettings}
              onClick={saveSettings}
              className="ml-auto px-3 py-2 rounded-md bg-[#C9A063] text-[#1a1a1a] text-sm font-semibold disabled:opacity-50"
            >
              Save settings
            </button>
          </div>

          <h3 className="text-sm font-bold text-gray-900 mb-2">Per-driver commission overrides</h3>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="text-left px-3 py-2">Driver</th>
                  <th className="text-left px-3 py-2">Vehicle</th>
                  <th className="text-right px-3 py-2">Override %</th>
                  <th className="text-right px-3 py-2">Effective %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {settingsDrivers.map((d) => {
                  const overrideVal =
                    overrides[d.id] !== undefined
                      ? overrides[d.id]
                      : d.commissionPctOverride != null
                        ? String(d.commissionPctOverride)
                        : "";
                  const effective =
                    overrideVal.trim() !== ""
                      ? Number(overrideVal)
                      : settings?.defaultPlatformCommissionPercent ?? 20;
                  return (
                    <tr key={d.id} className="hover:bg-gray-50/70">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-gray-900">{d.name}</div>
                        <div className="text-[11px] text-gray-500">{d.email}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{d.vehicle}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="—"
                          value={overrideVal}
                          onChange={(e) =>
                            setOverrides((p) => ({ ...p, [d.id]: e.target.value }))
                          }
                          className="w-24 px-2 py-1 rounded-md border border-gray-200 text-sm text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-semibold text-gray-700 tabular-nums">
                        {Number.isFinite(effective) ? `${Number(effective).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-bold text-gray-900 inline-flex items-center gap-2">
              <Database className="w-4 h-4 text-[#C9A063]" />
              Backfill historical DONE / NO_SHOW
            </h3>
            <button
              type="button"
              disabled={backfillBusy}
              onClick={() => runBackfill(true)}
              className="px-3 py-1.5 rounded-md border border-gray-200 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              Dry run
            </button>
            <button
              type="button"
              disabled={backfillBusy}
              onClick={() => {
                if (confirm("Run backfill for real? This writes earnings/remittances for every past DONE/NO_SHOW missing a ledger row. Safe to re-run (skips existing).")) {
                  runBackfill(false);
                }
              }}
              className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-xs font-semibold hover:brightness-110 disabled:opacity-50"
            >
              Run backfill
            </button>
            {backfillStats ? (
              <div className="text-xs text-gray-600 ml-2 flex flex-wrap gap-x-3">
                <span>Scanned: <b className="text-gray-900">{backfillStats.scanned}</b></span>
                <span>Earnings: <b className="text-emerald-700">{backfillStats.createdEarnings}</b></span>
                <span>Remittances: <b className="text-[#8B6914]">{backfillStats.createdRemittances}</b></span>
                <span>Skipped: <b>{backfillStats.skipped}</b></span>
                {backfillStats.errors > 0 ? <span className="text-red-600">Errors: <b>{backfillStats.errors}</b></span> : null}
                {backfillStats.dryRun ? <span className="text-amber-700">(dry run)</span> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Ready-to-batch cards */}
      {ready.length > 0 ? (
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 mb-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#C9A063]" />
            Ready to pay out
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ready.map((r) => (
              <div
                key={r.driverId}
                className="rounded-lg border border-gray-200 p-4 bg-gradient-to-br from-white to-[#C9A063]/5 flex flex-col gap-2"
              >
                <div>
                  <div className="font-semibold text-gray-900">{r.driver?.name || r.driverId}</div>
                  <div className="text-[11px] text-gray-500">{r.driver?.vehicle || ""}</div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xs text-gray-500">Unpaid total</div>
                    <div className="text-2xl font-bold text-gray-900 tabular-nums">
                      {money(r.total)}
                    </div>
                    <div className="text-[11px] text-gray-500">{r.count} earnings</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateOpen(r)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#C9A063] text-[#1a1a1a] text-xs font-bold hover:brightness-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create batch
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Phase 2 — Driver Adjustments */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-5 mb-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 inline-flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#C9A063]" />
            Driver Adjustments
          </h2>
          {adjSummary ? (
            <div className="text-xs text-gray-500 flex gap-x-3">
              <span>
                + {money(adjSummary.positive)}
              </span>
              <span>
                − {money(Math.abs(adjSummary.negative))}
              </span>
              <span className="text-gray-700 font-semibold">
                Net {money(adjSummary.net)}
              </span>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <select
            value={adjForm.driverId}
            onChange={(e) => setAdjForm((p) => ({ ...p, driverId: e.target.value }))}
            className="px-3 py-2 rounded-md border border-gray-200 text-sm md:col-span-2"
          >
            <option value="">Select driver…</option>
            {settingsDrivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {d.driverId}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Amount (±) CAD"
            value={adjForm.amount}
            onChange={(e) => setAdjForm((p) => ({ ...p, amount: e.target.value }))}
            className="px-3 py-2 rounded-md border border-gray-200 text-sm"
          />
          <select
            value={adjForm.reason}
            onChange={(e) => setAdjForm((p) => ({ ...p, reason: e.target.value }))}
            className="px-3 py-2 rounded-md border border-gray-200 text-sm"
          >
            <option value="BONUS">Bonus (+)</option>
            <option value="DEDUCTION">Deduction (−)</option>
            <option value="CLAWBACK">Clawback (−)</option>
            <option value="OFF_PLATFORM_PAY">Off-platform pay (+)</option>
            <option value="CORRECTION">Correction</option>
            <option value="OTHER">Other</option>
          </select>
          <button
            type="button"
            disabled={adjustmentsBusy}
            onClick={submitAdjustment}
            className="px-3 py-2 rounded-md bg-[#C9A063] text-[#1a1a1a] text-sm font-semibold disabled:opacity-50"
          >
            Save adjustment
          </button>
        </div>
        <input
          type="text"
          placeholder="Reason / note (required for audit — e.g. “Referral bonus Oct”)"
          value={adjForm.notes}
          onChange={(e) => setAdjForm((p) => ({ ...p, notes: e.target.value }))}
          className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm mb-4"
        />

        {adjustments.length === 0 ? (
          <p className="text-xs text-gray-500 italic text-center py-6">
            No adjustments yet. Use the form above to record a bonus, clawback or off-platform payout.
          </p>
        ) : (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="text-left px-3 py-2">When</th>
                  <th className="text-left px-3 py-2">Driver</th>
                  <th className="text-left px-3 py-2">Reason</th>
                  <th className="text-right px-3 py-2">Amount</th>
                  <th className="text-left px-3 py-2">Notes</th>
                  <th className="text-left px-3 py-2">Payout</th>
                  <th className="text-right px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {adjustments.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/70">
                    <td className="px-3 py-2 text-gray-500 tabular-nums whitespace-nowrap">
                      {formatWhen(a.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-gray-900">{a.driver.name}</div>
                      <div className="text-[10px] text-gray-500">{a.driver.driverId}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                        {a.reason}
                      </span>
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums font-bold ${
                        a.amount >= 0 ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {a.amount >= 0 ? "+" : "−"}
                      {money(Math.abs(a.amount))}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{a.notes || "—"}</td>
                    <td className="px-3 py-2">
                      {a.payout ? (
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            a.payout.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-[#C9A063]/15 text-[#8B6914]"
                          }`}
                        >
                          {a.payout.status}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {a.payout?.status === "PAID" ? (
                        <span className="text-gray-300 text-[10px]">PAID</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => deleteAdjustment(a.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete adjustment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Phase 2 — Stripe Connect panel */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-5 mb-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 inline-flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[#C9A063]" />
            Driver Bank Accounts (Stripe Connect)
          </h2>
          <div className="text-[11px] text-gray-500">
            {connectInfo?.available ? (
              <>
                Stripe:{" "}
                <span className="font-semibold text-gray-700">connected</span>
                {" · "}
                Auto transfers on Mark Paid:{" "}
                <span
                  className={`font-semibold ${
                    connectInfo.payoutsLive ? "text-emerald-700" : "text-gray-500"
                  }`}
                >
                  {connectInfo.payoutsLive ? "ON" : "OFF (set STRIPE_CONNECT_ENABLED=true)"}
                </span>
              </>
            ) : (
              <span className="text-amber-700">Stripe not configured (STRIPE_SECRET_KEY missing)</span>
            )}
          </div>
        </div>

        {connectRows.length === 0 ? (
          <p className="text-xs text-gray-500 italic text-center py-6">No drivers loaded.</p>
        ) : (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="text-left px-3 py-2">Driver</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Stripe account</th>
                  <th className="text-left px-3 py-2">Last sync</th>
                  <th className="text-right px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {connectRows.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/70">
                    <td className="px-3 py-2">
                      <div className="font-semibold text-gray-900">{d.name}</div>
                      <div className="text-[10px] text-gray-500">{d.driverId}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          d.stripeConnectStatus === "ENABLED"
                            ? "bg-emerald-50 text-emerald-700"
                            : d.stripeConnectStatus === "PENDING"
                              ? "bg-[#C9A063]/15 text-[#8B6914]"
                              : d.stripeConnectStatus === "RESTRICTED"
                                ? "bg-red-50 text-red-700"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {d.stripeConnectStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-gray-500 truncate max-w-[180px]">
                      {d.stripeConnectAccountId || "—"}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-500">
                      {d.stripeConnectUpdatedAt ? formatWhen(d.stripeConnectUpdatedAt) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={!connectInfo?.available || connectBusyDriver === d.id}
                        onClick={() => startConnectForDriver(d.id)}
                        className="px-2.5 py-1 rounded text-[10px] font-semibold bg-[#C9A063] text-[#1a1a1a] disabled:opacity-50 mr-1"
                      >
                        {d.stripeConnectAccountId ? "Open onboarding" : "Start onboarding"}
                      </button>
                      <button
                        type="button"
                        disabled={!connectInfo?.available || !d.stripeConnectAccountId || connectBusyDriver === d.id}
                        onClick={() => refreshConnectForDriver(d.id)}
                        className="px-2.5 py-1 rounded text-[10px] font-semibold border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Refresh
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <SummaryCard
          icon={<Wallet className="w-4 h-4 text-[#C9A063]" />}
          label="Open draft batches"
          value={summary ? money(summary.draft.total) : "—"}
          hint={summary ? `${summary.draft.count} batches awaiting payment` : ""}
        />
        <SummaryCard
          icon={<Banknote className="w-4 h-4 text-emerald-600" />}
          label="Paid (lifetime)"
          value={summary ? money(summary.paid.total) : "—"}
          hint={summary ? `${summary.paid.count} batches cleared` : ""}
        />
      </div>

      <div className="rounded-xl border border-gray-200/80 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { k: "draft", label: `Draft (${summary?.draft.count ?? "—"})` },
              { k: "paid", label: `Paid (${summary?.paid.count ?? "—"})` },
              { k: "cancelled", label: "Cancelled" },
              { k: "all", label: "All" },
            ].map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => setTab(t.k as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  tab === t.k
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {initialLoad ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-red-600 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          </div>
        ) : payouts.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <Wallet className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-600">No payouts in this view yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="text-left px-4 py-3">Driver</th>
                  <th className="text-left px-4 py-3">Created</th>
                  <th className="text-left px-4 py-3">Method</th>
                  <th className="text-left px-4 py-3">Earnings</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{p.driver.name}</div>
                      <div className="text-[11px] text-gray-500">{p.driver.vehicle}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 tabular-nums">
                      {formatWhen(p.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      <span className="inline-flex items-center gap-1 font-semibold">{p.method}</span>
                      {p.reference ? (
                        <div className="text-[10px] text-gray-500 font-mono truncate max-w-[150px]">
                          {p.reference}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <details>
                        <summary className="cursor-pointer select-none hover:text-gray-900">
                          {p.earnings.length} ride{p.earnings.length === 1 ? "" : "s"}
                        </summary>
                        <ul className="mt-2 space-y-1">
                          {p.earnings.map((e) => (
                            <li key={e.id} className="flex items-center gap-2">
                              <Link
                                href={`/admin/reservations?q=${encodeURIComponent(e.bookingId)}`}
                                className="font-mono text-[10px] bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded"
                              >
                                {e.bookingId}
                              </Link>
                              <span className="tabular-nums">{money(e.driverNet)}</span>
                              {e.mode === "NO_SHOW" ? (
                                <span className="text-[9px] text-red-600 font-semibold">NS</span>
                              ) : null}
                              {e.needsReview ? (
                                <AlertTriangle className="w-3 h-3 text-red-500" />
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </details>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-gray-900">
                      {money(p.amount)}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === "DRAFT" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#C9A063]/15 text-[#8B6914]">
                          Draft
                        </span>
                      ) : p.status === "PAID" ? (
                        <>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                            Paid
                          </span>
                          <div className="text-[10px] text-gray-500 mt-1">
                            {formatWhen(p.paidAt)}
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-600">
                            Cancelled
                          </span>
                          {p.cancelledReason ? (
                            <div className="text-[10px] text-gray-500 mt-1 italic">
                              {p.cancelledReason}
                            </div>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === "DRAFT" ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setPayOpen(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:brightness-110"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Mark paid
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancelOpen(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-gray-600 hover:bg-gray-100"
                            title="Cancel batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createOpen ? (
        <CreateBatchModal
          ready={createOpen}
          busy={actionBusy}
          onClose={() => setCreateOpen(null)}
          onCreate={createBatch}
        />
      ) : null}
      {payOpen ? (
        <MarkPaidModal
          payout={payOpen}
          busy={actionBusy}
          onClose={() => setPayOpen(null)}
          onConfirm={markPaid}
          connectDriver={connectRows.find((d) => d.id === payOpen.driverId) || null}
          connectLive={!!connectInfo?.payoutsLive}
        />
      ) : null}
      {cancelOpen ? (
        <CancelBatchModal
          payout={cancelOpen}
          busy={actionBusy}
          onClose={() => setCancelOpen(null)}
          onConfirm={cancelBatch}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
      {hint ? <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p> : null}
    </div>
  );
}

function CreateBatchModal({
  ready,
  busy,
  onClose,
  onCreate,
}: {
  ready: ReadyDriver;
  busy: boolean;
  onClose: () => void;
  onCreate: (driverId: string, method: string, reference: string, notes: string) => void;
}) {
  const [method, setMethod] = useState("INTERAC");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Create payout batch</h3>
            <p className="text-xs text-gray-500">
              {ready.driver?.name || ready.driverId} · {money(ready.total)} · {ready.count} earnings
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <label className="text-xs text-gray-600 flex flex-col gap-1">
            Method
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-200 text-sm"
            >
              <option value="INTERAC">Interac e-Transfer</option>
              <option value="EFT">EFT</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="text-xs text-gray-600 flex flex-col gap-1">
            Reference / notes for driver
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-200 text-sm"
            />
          </label>
          <label className="text-xs text-gray-600 flex flex-col gap-1">
            Internal note
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-200 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => onCreate(ready.driverId, method, reference, notes)}
            className="w-full px-3 py-2 rounded-md bg-[#C9A063] text-[#1a1a1a] text-sm font-semibold disabled:opacity-50"
          >
            Create DRAFT batch ({money(ready.total)})
          </button>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            All eligible PENDING earnings (excluding flagged review items) will be attached in a
            single transaction. If anything changes mid-flight, the batch is rejected.
          </p>
        </div>
      </div>
    </div>
  );
}

function MarkPaidModal({
  payout,
  busy,
  onClose,
  onConfirm,
  connectDriver,
  connectLive,
}: {
  payout: Payout;
  busy: boolean;
  onClose: () => void;
  onConfirm: (
    payout: Payout,
    method: string,
    reference: string,
    notes: string,
    viaConnect: boolean
  ) => void;
  connectDriver: ConnectDriverRow | null;
  connectLive: boolean;
}) {
  const [method, setMethod] = useState(payout.method);
  const [reference, setReference] = useState(payout.reference || "");
  const [notes, setNotes] = useState(payout.notes || "");
  const canConnect =
    connectLive && !!connectDriver && connectDriver.stripeConnectStatus === "ENABLED";
  const [viaConnect, setViaConnect] = useState<boolean>(canConnect);
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Mark payout paid</h3>
            <p className="text-xs text-gray-500">
              {payout.driver.name} · {payout.earnings.length} earnings
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-xs text-emerald-700 uppercase tracking-wider font-semibold">
              Confirmed amount
            </div>
            <div className="text-2xl font-bold text-emerald-900 tabular-nums">
              {money(payout.amount)}
            </div>
            <div className="text-[11px] text-emerald-700 mt-1">
              The server re-sums nets at Mark Paid — if any attached earning changed, this will
              reject with AMOUNT_MISMATCH.
            </div>
          </div>
          <label className="text-xs text-gray-600 flex flex-col gap-1">
            Method actually used
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-200 text-sm"
            >
              <option value="INTERAC">Interac e-Transfer</option>
              <option value="EFT">EFT</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="text-xs text-gray-600 flex flex-col gap-1">
            Reference (txn id / cheque #)
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-200 text-sm"
            />
          </label>
          <label className="text-xs text-gray-600 flex flex-col gap-1">
            Internal note
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-200 text-sm"
            />
          </label>
          {canConnect ? (
            <label className="flex items-start gap-2 text-xs text-gray-700 rounded-md border border-[#C9A063]/30 bg-[#C9A063]/5 px-3 py-2">
              <input
                type="checkbox"
                checked={viaConnect}
                onChange={(e) => setViaConnect(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Also create Stripe Transfer to the driver's connected bank account (
                <span className="font-mono text-[10px]">
                  {connectDriver?.stripeConnectAccountId}
                </span>
                ). Uncheck for manual Interac / EFT / cheque — the ledger still flips to PAID.
              </span>
            </label>
          ) : connectDriver && connectDriver.stripeConnectStatus !== "ENABLED" ? (
            <div className="text-[11px] text-amber-700 rounded-md bg-amber-50 px-3 py-2">
              Driver's Connect status is{" "}
              <span className="font-semibold">{connectDriver.stripeConnectStatus}</span> — Mark Paid
              will log the ledger only (manual payout rail).
            </div>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(payout, method, reference, notes, canConnect && viaConnect)}
            className="w-full px-3 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {canConnect && viaConnect
              ? `Confirm & Transfer ${money(payout.amount)}`
              : `Confirm paid ${money(payout.amount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelBatchModal({
  payout,
  busy,
  onClose,
  onConfirm,
}: {
  payout: Payout;
  busy: boolean;
  onClose: () => void;
  onConfirm: (payout: Payout, reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Cancel DRAFT batch</h3>
            <p className="text-xs text-gray-500">
              Restores {payout.earnings.length} earnings back to PENDING.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <label className="text-xs text-gray-600 flex flex-col gap-1">
            Reason (required)
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-200 text-sm"
              placeholder="e.g. wrong amount / wrong driver"
            />
          </label>
          <button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={() => onConfirm(payout, reason.trim())}
            className="w-full px-3 py-2 rounded-md bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            Cancel batch & restore earnings
          </button>
        </div>
      </div>
    </div>
  );
}
