"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Settings,
  Wallet,
  X,
} from "lucide-react";

type DriverBrief = {
  id: string;
  driverId: string;
  name: string;
  email: string;
  vehicle: string;
};

type Earning = {
  id: string;
  bookingId: string;
  driverId: string;
  status: string;
  holdReason: string | null;
  needsReview: boolean;
  reviewReason: string | null;
  payoutId: string | null;
  subtotal: number;
  discountAmount: number;
  gratuity: number;
  serviceBasis: number;
  commissionPct: number;
  platformFee: number;
  driverNet: number;
  completedAt: string;
  notes: string | null;
  driver: DriverBrief & { vehiclePlate?: string };
  reservation: {
    bookingId: string;
    serviceDate: string;
    serviceTime: string;
    pickupLocation: string;
    dropoffLocation: string;
    paymentStatus: string | null;
    total: number;
  };
};

type Remittance = {
  id: string;
  bookingId: string;
  driverId: string;
  status: string;
  amountOwed: number;
  serviceBasis: number;
  commissionPct: number;
  completedAt: string;
  driver: { id: string; driverId: string; name: string; vehicle: string };
  reservation: {
    bookingId: string;
    serviceDate: string;
    serviceTime: string;
    pickupLocation: string;
    total: number;
  };
};

type ReadyDriver = {
  driverId: string;
  driver: DriverBrief | null;
  count: number;
  total: number;
};

type Payout = {
  id: string;
  driverId: string;
  amount: number;
  method: string;
  reference: string | null;
  status: string;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  driver: DriverBrief;
  earnings: Array<{ id: string; bookingId: string; driverNet: number; completedAt: string }>;
};

type SettingsDriver = {
  id: string;
  driverId: string;
  name: string;
  email: string;
  vehicle: string;
  commissionPctOverride: number | null;
};

type Tab = "to-pay" | "paid" | "waiting" | "cash" | "settings";

const PAY_METHODS = ["INTERAC", "EFT", "CHEQUE"] as const;

function money(n: number | null | undefined) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return `$${n.toFixed(2)}`;
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function shortLoc(s?: string | null) {
  if (!s?.trim()) return "—";
  return s.split(",")[0]?.trim() || s.trim();
}

function holdLabel(reason: string | null) {
  if (!reason) return "Waiting";
  const map: Record<string, string> = {
    AWAITING_CUSTOMER_PAYMENT: "Waiting for customer payment",
    COMPED: "Comped trip",
    CUSTOMER_REFUNDED: "Customer refunded",
  };
  return map[reason] || reason.replace(/_/g, " ").toLowerCase();
}

export default function AdminDriverPayPage() {
  const [tab, setTab] = useState<Tab>("to-pay");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [ready, setReady] = useState<ReadyDriver[]>([]);
  const [pendingByDriver, setPendingByDriver] = useState<Record<string, Earning[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const [paidPayouts, setPaidPayouts] = useState<Payout[]>([]);
  const [draftPayouts, setDraftPayouts] = useState<Payout[]>([]);

  const [waiting, setWaiting] = useState<Earning[]>([]);
  const [cashOwed, setCashOwed] = useState<Remittance[]>([]);

  const [defaultPct, setDefaultPct] = useState("20");
  const [settingsDrivers, setSettingsDrivers] = useState<SettingsDriver[]>([]);
  const [overrideDraft, setOverrideDraft] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);

  const [payModal, setPayModal] = useState<ReadyDriver | null>(null);
  const [payMethod, setPayMethod] = useState<(typeof PAY_METHODS)[number]>("INTERAC");
  const [payReference, setPayReference] = useState("");
  const [editEarning, setEditEarning] = useState<Earning | null>(null);
  const [editPct, setEditPct] = useState("");

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    try {
      if (opts?.soft) setRefreshing(true);
      else setLoading(true);
      setError("");

      const [readyRes, paidRes, draftRes, pendingRes, heldRes, reviewRes, remitRes, settingsRes] =
        await Promise.all([
          fetch("/api/admin/driver-payouts?limit=1", { credentials: "include" }),
          fetch("/api/admin/driver-payouts?status=PAID&limit=50", { credentials: "include" }),
          fetch("/api/admin/driver-payouts?status=DRAFT&limit=50", { credentials: "include" }),
          fetch("/api/admin/driver-earnings?status=PENDING&includeRemittances=0&limit=200", {
            credentials: "include",
          }),
          fetch("/api/admin/driver-earnings?status=HELD&includeRemittances=0&limit=100", {
            credentials: "include",
          }),
          fetch("/api/admin/driver-earnings?needsReview=1&includeRemittances=0&limit=100", {
            credentials: "include",
          }),
          fetch("/api/admin/driver-remittances?status=OWED&limit=100", { credentials: "include" }),
          fetch("/api/admin/driver-pay-settings", { credentials: "include" }),
        ]);

      const readyData = await readyRes.json();
      const paidData = await paidRes.json();
      const draftData = await draftRes.json();
      const pendingData = await pendingRes.json();
      const heldData = await heldRes.json();
      const reviewData = await reviewRes.json();
      const remitData = await remitRes.json();
      const settingsData = await settingsRes.json();

      if (!readyData.success) throw new Error(readyData.error || "Failed to load payouts");
      if (!pendingData.success) throw new Error(pendingData.error || "Failed to load earnings");

      setReady(readyData.ready || []);
      setPaidPayouts(paidData.success ? paidData.payouts || [] : []);
      setDraftPayouts(draftData.success ? draftData.payouts || [] : []);

      // Only payable rows for To pay expand — skip review flags and DRAFT-attached orphans
      // (those belong under Unfinished pay / Waiting, not the Pay button total).
      const pendingRows: Earning[] = pendingData.earnings || [];
      const grouped: Record<string, Earning[]> = {};
      for (const e of pendingRows) {
        if (e.needsReview) continue;
        if (e.payoutId) continue;
        if (!grouped[e.driverId]) grouped[e.driverId] = [];
        grouped[e.driverId].push(e);
      }
      setPendingByDriver(grouped);

      const heldRows: Earning[] = heldData.success ? heldData.earnings || [] : [];
      const reviewRows: Earning[] = reviewData.success ? reviewData.earnings || [] : [];
      const waitingMap = new Map<string, Earning>();
      for (const e of [...heldRows, ...reviewRows]) waitingMap.set(e.id, e);
      setWaiting(Array.from(waitingMap.values()));

      setCashOwed(remitData.success ? remitData.remittances || [] : []);

      if (settingsData.success) {
        setDefaultPct(String(settingsData.settings?.defaultPlatformCommissionPercent ?? 20));
        const drivers: SettingsDriver[] = settingsData.drivers || [];
        setSettingsDrivers(drivers);
        const draft: Record<string, string> = {};
        for (const d of drivers) {
          draft[d.id] =
            d.commissionPctOverride == null ? "" : String(d.commissionPctOverride);
        }
        setOverrideDraft(draft);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Driver Pay");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toPayTotal = useMemo(
    () => ready.reduce((s, r) => s + (r.total || 0), 0),
    [ready]
  );

  const oneClickPay = async () => {
    if (!payModal) return;
    setBusy(true);
    setError("");
    try {
      const createRes = await fetch("/api/admin/driver-payouts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          driverId: payModal.driverId,
          method: payMethod,
          reference: payReference.trim() || undefined,
        }),
      });
      const createData = await createRes.json();
      if (!createData.success) {
        throw new Error(createData.error || "Could not prepare payout");
      }

      const markRes = await fetch("/api/admin/driver-payouts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "markPaid",
          payoutId: createData.payoutId,
          expectedAmount: createData.amount,
          method: payMethod,
          reference: payReference.trim() || undefined,
          viaConnect: false,
          idempotencyKey: `pay-${createData.payoutId}-${Date.now()}`,
        }),
      });
      const markData = await markRes.json();
      if (!markData.success) {
        // Create already succeeded — reload so Unfinished pay shows the DRAFT to Complete/Cancel.
        await load({ soft: true });
        throw new Error(markData.error || "Could not mark paid — finish it under Unfinished pay");
      }

      setPayModal(null);
      setPayReference("");
      setPayMethod("INTERAC");
      await load({ soft: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pay failed");
    } finally {
      setBusy(false);
    }
  };

  const finishDraft = async (payout: Payout) => {
    setBusy(true);
    setError("");
    try {
      const markRes = await fetch("/api/admin/driver-payouts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "markPaid",
          payoutId: payout.id,
          expectedAmount: payout.amount,
          method: payout.method || "INTERAC",
          viaConnect: false,
          idempotencyKey: `finish-${payout.id}-${Date.now()}`,
        }),
      });
      const markData = await markRes.json();
      if (!markData.success) throw new Error(markData.error || "Could not complete pay");
      await load({ soft: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete pay");
    } finally {
      setBusy(false);
    }
  };

  const cancelDraft = async (payout: Payout) => {
    if (!confirm("Cancel this unfinished pay? Trips go back to To pay.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/driver-payouts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", payoutId: payout.id, reason: "Cancelled from Driver Pay" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Cancel failed");
      await load({ soft: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  };

  const patchEarning = async (earningId: string, body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/driver-earnings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ earningId, ...body }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Update failed");
      setEditEarning(null);
      await load({ soft: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const markCashCollected = async (remittanceId: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/driver-remittances", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remittanceId, action: "remitted", method: "CASH" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Could not mark collected");
      await load({ soft: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark collected");
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setError("");
    try {
      const pct = Number(defaultPct);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        throw new Error("Company % must be between 0 and 100");
      }
      const driverOverrides = settingsDrivers.map((d) => {
        const raw = overrideDraft[d.id]?.trim() ?? "";
        if (raw === "") return { driverId: d.id, commissionPctOverride: null };
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          throw new Error(`Invalid % for ${d.name}`);
        }
        return { driverId: d.id, commissionPctOverride: n };
      });

      const res = await fetch("/api/admin/driver-pay-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultPlatformCommissionPercent: pct,
          driverOverrides,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save settings");
      await load({ soft: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "to-pay", label: "To pay", count: ready.length },
    { id: "paid", label: "Paid", count: paidPayouts.length },
    { id: "waiting", label: "Waiting", count: waiting.length },
    { id: "cash", label: "Cash trips", count: cashOwed.length },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#C9A063] text-sm font-semibold uppercase tracking-wider mb-1">
            <Wallet className="w-4 h-4" />
            Driver Pay
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Pay your drivers</h1>
          <p className="text-gray-500 text-sm mt-1 max-w-xl">
            Trips land here when done. Set the company %, then Mark Paid after Interac / EFT / cheque.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load({ soft: true })}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-[#C9A063]/40"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button type="button" onClick={() => setError("")} className="text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Ready to pay" value={money(toPayTotal)} hint={`${ready.length} drivers`} />
        <StatCard
          label="Waiting"
          value={String(waiting.length)}
          hint="Need release or check"
        />
        <StatCard
          label="Cash to collect"
          value={money(cashOwed.reduce((s, r) => s + r.amountOwed, 0))}
          hint={`${cashOwed.length} trips`}
        />
        <StatCard label="Paid recently" value={String(paidPayouts.length)} hint="batches shown" />
      </div>

      {draftPayouts.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
          <div className="text-sm font-semibold text-amber-900">Unfinished pay</div>
          <p className="text-xs text-amber-800">
            Left over from the old payout screen. Complete or cancel so trips return to To pay.
          </p>
          {draftPayouts.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-amber-100 px-4 py-3"
            >
              <div>
                <div className="font-semibold text-gray-900">{p.driver?.name || p.driverId}</div>
                <div className="text-xs text-gray-500">
                  {money(p.amount)} · {p.earnings?.length || 0} trips · {p.method}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void finishDraft(p)}
                  className="px-3 py-1.5 rounded-lg bg-[#C9A063] text-white text-sm font-semibold"
                >
                  Complete
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void cancelDraft(p)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === t.id
                ? "bg-[#C9A063] text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-[#C9A063]/40"
            }`}
          >
            {t.label}
            {typeof t.count === "number" ? (
              <span className="ml-1.5 opacity-80 tabular-nums">({t.count})</span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-7 h-7 animate-spin text-[#C9A063]" />
        </div>
      ) : null}

      {!loading && tab === "to-pay" ? (
        <div className="space-y-3">
          {ready.length === 0 ? (
            <EmptyState text="Nothing to pay right now. Completed trips will show here." />
          ) : (
            ready.map((r) => {
              const trips = pendingByDriver[r.driverId] || [];
              const open = expanded === r.driverId;
              return (
                <div
                  key={r.driverId}
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : r.driverId)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      {open ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {r.driver?.name || "Driver"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {r.driver?.driverId || r.driverId} · {r.count} trip
                          {r.count === 1 ? "" : "s"}
                        </div>
                      </div>
                    </button>
                    <div className="text-lg font-bold text-gray-900 tabular-nums">{money(r.total)}</div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setPayModal(r);
                        setPayMethod("INTERAC");
                        setPayReference("");
                      }}
                      className="px-4 py-2 rounded-xl bg-[#C9A063] text-white text-sm font-semibold hover:bg-[#B8935A] disabled:opacity-60"
                    >
                      Pay
                    </button>
                  </div>
                  {open ? (
                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                      {trips.map((e) => (
                        <div
                          key={e.id}
                          className="px-4 py-3 flex flex-wrap items-center gap-3 text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{e.bookingId}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {shortLoc(e.reservation?.pickupLocation)} →{" "}
                              {shortLoc(e.reservation?.dropoffLocation)}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {formatWhen(e.completedAt)} · Company {e.commissionPct.toFixed(1)}% ·
                              Fuel &amp; Grat {money(e.gratuity)}
                            </div>
                          </div>
                          <div className="font-semibold tabular-nums text-gray-900">
                            {money(e.driverNet)}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditEarning(e);
                              setEditPct(String(e.commissionPct));
                            }}
                            className="text-xs font-semibold text-[#C9A063] hover:underline"
                          >
                            Edit %
                          </button>
                        </div>
                      ))}
                      {trips.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-gray-400">
                          Expand refresh if trips don&apos;t list — total still payable.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {!loading && tab === "paid" ? (
        <div className="space-y-3">
          {paidPayouts.length === 0 ? (
            <EmptyState text="No paid history yet." />
          ) : (
            paidPayouts.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 flex flex-wrap items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{p.driver?.name || p.driverId}</div>
                  <div className="text-xs text-gray-500">
                    {p.method}
                    {p.reference ? ` · ${p.reference}` : ""} · {p.earnings?.length || 0} trips ·{" "}
                    {formatWhen(p.paidAt || p.createdAt)}
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 text-emerald-700 text-sm font-semibold">
                  <Check className="w-4 h-4" />
                  {money(p.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {!loading && tab === "waiting" ? (
        <div className="space-y-3">
          {waiting.length === 0 ? (
            <EmptyState text="Nothing waiting. Held or flagged trips show here." />
          ) : (
            waiting.map((e) => (
              <div
                key={e.id}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 flex flex-wrap items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">
                    {e.driver?.name} · {e.bookingId}
                  </div>
                  <div className="text-xs text-amber-700 mt-0.5">
                    {e.status === "HELD"
                      ? holdLabel(e.holdReason)
                      : e.needsReview
                        ? `Needs a quick check${e.reviewReason ? ` · ${e.reviewReason}` : ""}`
                        : e.status}
                  </div>
                  <div className="text-xs text-gray-400">{formatWhen(e.completedAt)}</div>
                </div>
                <div className="font-semibold tabular-nums">{money(e.driverNet)}</div>
                {e.status === "HELD" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patchEarning(e.id, { action: "release", releaseTo: "PENDING" })}
                    className="px-3 py-1.5 rounded-lg bg-[#C9A063] text-white text-sm font-semibold"
                  >
                    Release
                  </button>
                ) : null}
                {e.needsReview ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void patchEarning(e.id, { action: "clearReview", reason: "Cleared from Driver Pay" })
                    }
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700"
                  >
                    Clear check
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      {!loading && tab === "cash" ? (
        <div className="space-y-3">
          {cashOwed.length === 0 ? (
            <EmptyState text="No cash trips to collect from drivers." />
          ) : (
            cashOwed.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 flex flex-wrap items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">
                    Collect from {r.driver?.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {r.bookingId} · company share of cash trip · {formatWhen(r.completedAt)}
                  </div>
                </div>
                <div className="font-bold tabular-nums text-gray-900">{money(r.amountOwed)}</div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void markCashCollected(r.id)}
                  className="px-3 py-1.5 rounded-lg bg-[#C9A063] text-white text-sm font-semibold"
                >
                  Mark collected
                </button>
              </div>
            ))
          )}
        </div>
      ) : null}

      {!loading && tab === "settings" ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-center gap-2 text-gray-900 font-semibold">
              <Settings className="w-4 h-4 text-[#C9A063]" />
              Company split
            </div>
            <p className="text-sm text-gray-500">
              Default % the company keeps from the trip amount (before Fuel &amp; Grat). Fuel &amp; Grat always stays with the
              driver. Per-driver override wins when set.
            </p>
            <label className="block max-w-xs">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Default company %
              </span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={defaultPct}
                onChange={(e) => setDefaultPct(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-900 text-sm">
              Per-driver override
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-2.5 font-semibold">Driver</th>
                    <th className="px-4 py-2.5 font-semibold">Override %</th>
                  </tr>
                </thead>
                <tbody>
                  {settingsDrivers.map((d) => (
                    <tr key={d.id} className="border-b border-gray-50">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-900">{d.name}</div>
                        <div className="text-xs text-gray-400">{d.driverId}</div>
                      </td>
                      <td className="px-4 py-2.5 w-40">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          placeholder="Default"
                          value={overrideDraft[d.id] ?? ""}
                          onChange={(e) =>
                            setOverrideDraft((prev) => ({ ...prev, [d.id]: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            type="button"
            disabled={savingSettings}
            onClick={() => void saveSettings()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C9A063] text-white font-semibold text-sm disabled:opacity-60"
          >
            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save settings
          </button>
        </div>
      ) : null}

      {payModal ? (
        <Modal onClose={() => (!busy ? setPayModal(null) : undefined)}>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            Pay {payModal.driver?.name || "driver"}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {money(payModal.total)} for {payModal.count} trip{payModal.count === 1 ? "" : "s"}. Mark
            paid after you send Interac / EFT / cheque.
          </p>
          <label className="block mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</span>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as (typeof PAY_METHODS)[number])}
              className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
            >
              {PAY_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m === "INTERAC" ? "Interac" : m === "EFT" ? "EFT" : "Cheque"}
                </option>
              ))}
            </select>
          </label>
          <label className="block mb-5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Reference (optional)
            </span>
            <input
              value={payReference}
              onChange={(e) => setPayReference(e.target.value)}
              placeholder="e.g. Interac confirmation #"
              className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
            />
          </label>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => setPayModal(null)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void oneClickPay()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C9A063] text-white text-sm font-semibold disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Mark Paid
            </button>
          </div>
        </Modal>
      ) : null}

      {editEarning ? (
        <Modal onClose={() => (!busy ? setEditEarning(null) : undefined)}>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Edit company %</h3>
          <p className="text-sm text-gray-500 mb-4">
            {editEarning.bookingId} · driver currently gets {money(editEarning.driverNet)}
          </p>
          <label className="block mb-5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Company %
            </span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={editPct}
              onChange={(e) => setEditPct(e.target.value)}
              className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
            />
          </label>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditEarning(null)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const n = Number(editPct);
                if (!Number.isFinite(n) || n < 0 || n > 100) {
                  setError("Company % must be 0–100");
                  return;
                }
                void patchEarning(editEarning.id, { action: "edit", commissionPct: n });
              }}
              className="px-4 py-2 rounded-xl bg-[#C9A063] text-white text-sm font-semibold"
            >
              Save
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</div>
      <div className="text-xl font-bold text-gray-900 tabular-nums mt-1">{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{hint}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">{children}</div>
    </div>
  );
}
