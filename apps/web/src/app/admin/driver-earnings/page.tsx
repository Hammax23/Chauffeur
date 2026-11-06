// @ts-nocheck
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  AlertCircle,
  Receipt,
  RefreshCw,
  X,
  Check,
  Pencil,
  Shield,
  AlertTriangle,
  CircleDollarSign,
  Banknote,
  Wallet,
  ExternalLink,
} from "lucide-react";

type Earning = {
  id: string;
  bookingId: string;
  driverId: string;
  mode: "DONE" | "NO_SHOW" | string;
  status: "PENDING" | "PAID" | "VOID" | "REASSIGNED" | "HELD" | string;
  holdReason: string | null;
  needsReview: boolean;
  reviewReason: string | null;
  reviewNotes: string | null;
  subtotal: number;
  discountAmount: number;
  gratuity: number;
  hst: number;
  fareAdjustmentsTotal: number;
  serviceBasis: number;
  commissionPct: number;
  platformFee: number;
  driverNet: number;
  notes: string | null;
  payoutId: string | null;
  completedAt: string;
  createdAt: string;
  driver: { id: string; driverId: string; name: string; email: string; vehicle: string; vehiclePlate: string };
  reservation: {
    bookingId: string;
    serviceDate: string;
    serviceTime: string;
    pickupLocation: string;
    dropoffLocation: string;
    paymentStatus: string | null;
    total: number;
  };
  payout: { id: string; status: string; method: string; paidAt: string | null } | null;
};

type Remittance = {
  id: string;
  bookingId: string;
  driverId: string;
  status: "OWED" | "REMITTED" | "WAIVED" | string;
  serviceBasis: number;
  commissionPct: number;
  amountOwed: number;
  method: string | null;
  reference: string | null;
  completedAt: string;
  remittedAt: string | null;
  driver: { id: string; driverId: string; name: string; vehicle: string };
  reservation: {
    bookingId: string;
    serviceDate: string;
    serviceTime: string;
    pickupLocation: string;
    total: number;
  };
};

type Summary = {
  pending: { count: number; total: number };
  paid: { count: number; total: number };
  held: { count: number; total: number };
  needsReview: { count: number };
  remittanceOwed: { count: number; total: number };
  thisWeek: { count: number; total: number; rangeStart: string; rangeEnd: string; tz: string };
};

type Tab = "all" | "pending" | "held" | "review" | "cod";

function money(n: number | null | undefined) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return `$${n.toFixed(2)}`;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function statusBadge(status: string, holdReason?: string | null) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    PENDING: { bg: "bg-[#C9A063]/15", fg: "text-[#8B6914]", label: "Pending" },
    PAID: { bg: "bg-emerald-50", fg: "text-emerald-700", label: "Paid" },
    HELD: { bg: "bg-amber-50", fg: "text-amber-700", label: holdReason ? `Held · ${holdReason.replace(/_/g, " ").toLowerCase()}` : "Held" },
    VOID: { bg: "bg-gray-100", fg: "text-gray-500", label: "Void" },
    REASSIGNED: { bg: "bg-gray-100", fg: "text-gray-500", label: "Reassigned" },
  };
  const s = map[status] || { bg: "bg-gray-100", fg: "text-gray-600", label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${s.bg} ${s.fg}`}>
      {s.label}
    </span>
  );
}

export default function AdminDriverEarningsPage() {
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [remittances, setRemittances] = useState<Remittance[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [editing, setEditing] = useState<Earning | null>(null);
  const [remitModal, setRemitModal] = useState<Remittance | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 280);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(
    async (opts?: { cursor?: string; append?: boolean }) => {
      try {
        if (opts?.append) setLoadingMore(true);
        else setRefreshing(true);
        setError("");

        const params = new URLSearchParams();
        params.set("limit", "50");
        if (opts?.cursor) params.set("cursor", opts.cursor);
        if (tab === "pending") params.set("status", "PENDING");
        else if (tab === "held") params.set("status", "HELD");
        else if (tab === "review") params.set("needsReview", "1");
        if (debouncedQ) params.set("q", debouncedQ);

        const res = await fetch(`/api/admin/driver-earnings?${params}`, { credentials: "include" });
        const data = await res.json();

        if (!data.success) {
          setError(data.error || "Failed to load earnings");
          return;
        }

        setSummary(data.summary || null);
        setRemittances(data.remittances || []);
        setNextCursor(data.nextCursor || null);
        setEarnings((prev) =>
          opts?.append ? [...prev, ...(data.earnings || [])] : data.earnings || []
        );
      } catch {
        setError("Failed to connect to server");
      } finally {
        setInitialLoad(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [tab, debouncedQ]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (tab === "cod") return [];
    return earnings;
  }, [earnings, tab]);

  const visibleRemittances = useMemo(() => {
    if (tab === "cod") return remittances.filter((r) => r.status === "OWED");
    return [];
  }, [remittances, tab]);

  const updateEarning = async (patch: Record<string, unknown>) => {
    if (!editing) return;
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/driver-earnings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ earningId: editing.id, ...patch }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Update failed");
        return;
      }
      setEditing(null);
      await load();
    } finally {
      setActionBusy(false);
    }
  };

  const remitAction = async (body: Record<string, unknown>) => {
    if (!remitModal) return;
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/driver-remittances", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remittanceId: remitModal.id, ...body }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Update failed");
        return;
      }
      setRemitModal(null);
      await load();
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1500px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
            Driver Earnings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Enterprise ledger for every DONE / NO_SHOW trip. Edit unpaid amounts, release held rows,
            collect COD remittances, and keep the review queue empty.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={refreshing || initialLoad}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <SummaryCard
          icon={<CircleDollarSign className="w-4 h-4 text-[#C9A063]" />}
          label="Pending to pay"
          value={summary ? money(summary.pending.total) : "—"}
          hint={summary ? `${summary.pending.count} earnings` : ""}
        />
        <SummaryCard
          icon={<Banknote className="w-4 h-4 text-emerald-600" />}
          label="Paid (lifetime)"
          value={summary ? money(summary.paid.total) : "—"}
          hint={summary ? `${summary.paid.count} earnings` : ""}
        />
        <SummaryCard
          icon={<Shield className="w-4 h-4 text-amber-600" />}
          label="On hold"
          value={summary ? money(summary.held.total) : "—"}
          hint={summary ? `${summary.held.count} earnings` : ""}
        />
        <SummaryCard
          icon={<AlertTriangle className="w-4 h-4 text-red-600" />}
          label="Needs review"
          value={summary ? String(summary.needsReview.count) : "—"}
          hint="Refund / reassign queue"
        />
        <SummaryCard
          icon={<Wallet className="w-4 h-4 text-[#8B6914]" />}
          label="COD owed (company)"
          value={summary ? money(summary.remittanceOwed.total) : "—"}
          hint={summary ? `${summary.remittanceOwed.count} drivers` : ""}
        />
      </div>

      <div className="rounded-xl border border-gray-200/80 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { k: "all", label: `All (${summary ? summary.pending.count + summary.paid.count + summary.held.count : "—"})` },
              { k: "pending", label: `Pending (${summary?.pending.count ?? "—"})` },
              { k: "held", label: `Held (${summary?.held.count ?? "—"})` },
              { k: "review", label: `Needs review (${summary?.needsReview.count ?? "—"})` },
              { k: "cod", label: `COD remittances (${summary?.remittanceOwed.count ?? "—"})` },
            ].map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => setTab(t.k as Tab)}
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

          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search booking ID, driver, notes…"
              className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063]"
            />
            {q ? (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {initialLoad ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading earnings…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-red-600 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="text-sm font-semibold text-gray-700 underline"
            >
              Try again
            </button>
          </div>
        ) : tab === "cod" ? (
          visibleRemittances.length === 0 ? (
            <EmptyRow label="No outstanding COD remittances." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="text-left px-4 py-3">Booking</th>
                    <th className="text-left px-4 py-3">Driver</th>
                    <th className="text-left px-4 py-3">When</th>
                    <th className="text-right px-4 py-3">Fare</th>
                    <th className="text-right px-4 py-3">% / basis</th>
                    <th className="text-right px-4 py-3">Owed to company</th>
                    <th className="text-right px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleRemittances.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/reservations?q=${encodeURIComponent(r.bookingId)}`}
                          className="inline-flex items-center gap-1 font-mono text-[11px] bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded"
                        >
                          {r.bookingId}
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </Link>
                        <div className="text-[11px] text-gray-500 mt-1 truncate max-w-[200px]">
                          {r.reservation.pickupLocation}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{r.driver.name}</div>
                        <div className="text-[11px] text-gray-500">{r.driver.vehicle}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs tabular-nums">
                        {r.reservation.serviceDate} · {r.reservation.serviceTime}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{money(r.reservation.total)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                        {r.commissionPct.toFixed(1)}% / {money(r.serviceBasis)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                        {money(r.amountOwed)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setRemitModal(r)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#C9A063] text-[#1a1a1a] hover:brightness-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Mark remitted
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : visible.length === 0 ? (
          <EmptyRow
            label={
              tab === "review"
                ? "Review queue is empty."
                : tab === "held"
                  ? "No held earnings."
                  : tab === "pending"
                    ? "No pending earnings."
                    : "No earnings yet — ledger populates as drivers complete trips."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="text-left px-4 py-3">Booking</th>
                  <th className="text-left px-4 py-3">Driver</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Basis</th>
                  <th className="text-right px-4 py-3">% / Fee</th>
                  <th className="text-right px-4 py-3">Tip</th>
                  <th className="text-right px-4 py-3">Driver net</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((e) => (
                  <tr
                    key={e.id}
                    className={`hover:bg-gray-50/70 ${e.needsReview ? "bg-red-50/30" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/reservations?q=${encodeURIComponent(e.bookingId)}`}
                        className="inline-flex items-center gap-1 font-mono text-[11px] bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded"
                      >
                        {e.bookingId}
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                      <div className="text-[11px] text-gray-500 mt-1 truncate max-w-[220px]">
                        {e.reservation.serviceDate} · {e.reservation.serviceTime}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate max-w-[220px]">
                        {e.reservation.pickupLocation}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{e.driver.name}</div>
                      <div className="text-[11px] text-gray-500">{e.driver.vehicle}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {statusBadge(e.status, e.holdReason)}
                        {e.mode === "NO_SHOW" ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600">
                            No-show
                          </span>
                        ) : null}
                        {e.needsReview ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700">
                            <AlertTriangle className="w-3 h-3" />
                            {e.reviewReason?.replace(/_/g, " ").toLowerCase() || "review"}
                          </span>
                        ) : null}
                        {e.payout ? (
                          <span className="text-[10px] text-gray-500">
                            Payout {e.payout.status.toLowerCase()}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {money(e.serviceBasis)}
                      {e.fareAdjustmentsTotal > 0 ? (
                        <div
                          className="text-[10px] font-medium text-[#8B6914] mt-0.5"
                          title="PAID FareAdjustments (wait time, meet & greet, stops) folded into basis"
                        >
                          + {money(e.fareAdjustmentsTotal)} extras
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                      {e.commissionPct.toFixed(1)}% / {money(e.platformFee)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                      {money(e.gratuity)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                      {money(e.driverNet)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditing(e)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-[#8B6914] bg-[#C9A063]/15 hover:bg-[#C9A063]/25"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {nextCursor && tab !== "cod" ? (
          <div className="p-4 border-t border-gray-100 flex justify-center">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void load({ cursor: nextCursor, append: true })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-[#8B6914] bg-[#C9A063]/15 hover:bg-[#C9A063]/25 disabled:opacity-50"
            >
              {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Load more
            </button>
          </div>
        ) : null}
      </div>

      {editing ? (
        <EditEarningModal
          earning={editing}
          busy={actionBusy}
          onClose={() => setEditing(null)}
          onEdit={(pct, notes) => updateEarning({ action: "edit", commissionPct: pct, notes })}
          onVoid={(reason) => updateEarning({ action: "void", reason })}
          onRelease={(to) => updateEarning({ action: "release", releaseTo: to })}
          onClearReview={(reviewNotes) => updateEarning({ action: "clearReview", reviewNotes })}
          onRefreshExtras={() => updateEarning({ action: "refreshAdjustments" })}
        />
      ) : null}

      {remitModal ? (
        <RemitModal
          remittance={remitModal}
          busy={actionBusy}
          onClose={() => setRemitModal(null)}
          onRemit={(method, reference, notes) =>
            remitAction({ action: "remitted", method, reference, notes })
          }
          onWaive={(waivedReason) => remitAction({ action: "waive", waivedReason })}
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

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="py-16 px-6 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
        <Receipt className="w-5 h-5 text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-600">{label}</p>
    </div>
  );
}

function EditEarningModal({
  earning,
  busy,
  onClose,
  onEdit,
  onVoid,
  onRelease,
  onClearReview,
  onRefreshExtras,
}: {
  earning: Earning;
  busy: boolean;
  onClose: () => void;
  onEdit: (pct: number, notes: string | null) => void;
  onVoid: (reason: string) => void;
  onRelease: (to: "PENDING" | "VOID") => void;
  onClearReview: (notes: string) => void;
  onRefreshExtras: () => void;
}) {
  const [pct, setPct] = useState(earning.commissionPct.toString());
  const [notes, setNotes] = useState(earning.notes || "");
  const [voidReason, setVoidReason] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  const newPct = Number(pct);
  const newFee = Number.isFinite(newPct)
    ? Math.round((earning.serviceBasis * newPct) / 100 * 100) / 100
    : earning.platformFee;
  const newNet =
    Math.round((earning.serviceBasis - newFee) * 100) / 100 +
    Math.round(earning.gratuity * 100) / 100;

  const locked = earning.status === "PAID" || !!earning.payoutId;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Earning · {earning.bookingId}</h3>
            <p className="text-xs text-gray-500">
              {earning.driver.name} · {formatWhen(earning.completedAt)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KV label="Subtotal" value={money(earning.subtotal)} />
            <KV label="Discount" value={money(earning.discountAmount)} />
            <KV label="Tip (100%)" value={money(earning.gratuity)} />
            <KV label="HST (not driver)" value={money(earning.hst)} />
            <KV
              label="Extras (wait/M&G)"
              value={money(earning.fareAdjustmentsTotal)}
              highlight={earning.fareAdjustmentsTotal > 0}
            />
            <KV label="Service basis" value={money(earning.serviceBasis)} highlight />
            <KV label="Commission %" value={`${earning.commissionPct.toFixed(2)}%`} />
            <KV label="Platform fee" value={money(earning.platformFee)} />
            <KV label="Driver net" value={money(earning.driverNet)} highlight />
          </div>

          {!locked ? (
            <div className="rounded-lg border border-[#C9A063]/30 bg-[#C9A063]/5 p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#8B6914]">Extras (FareAdjustments)</div>
                <p className="text-[11px] text-[#5C4218]/80 mt-0.5 leading-snug">
                  Re-pull PAID wait / meet-&-greet / stop charges for this booking into the
                  earning&apos;s basis. Safe on unpaid rows only — recomputes platform fee + driver net.
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={onRefreshExtras}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#C9A063] text-[#1a1a1a] text-xs font-semibold hover:brightness-95 disabled:opacity-50 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh extras
              </button>
            </div>
          ) : null}

          {earning.needsReview ? (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
                <AlertTriangle className="w-4 h-4" />
                Needs review — {earning.reviewReason?.replace(/_/g, " ").toLowerCase() || ""}
              </div>
              {earning.reviewNotes ? (
                <p className="text-xs text-red-700 whitespace-pre-wrap">{earning.reviewNotes}</p>
              ) : null}
              <div className="flex items-end gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Resolution note"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-md border border-red-200 text-xs"
                />
                <button
                  type="button"
                  disabled={busy || !reviewNotes.trim()}
                  onClick={() => onClearReview(reviewNotes.trim())}
                  className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold disabled:opacity-50"
                >
                  Clear flag
                </button>
              </div>
            </div>
          ) : null}

          {earning.status === "HELD" ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="text-sm font-semibold text-amber-800 mb-2">
                On hold — {earning.holdReason?.replace(/_/g, " ").toLowerCase()}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRelease("PENDING")}
                  className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
                >
                  Release → Pending (payable)
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRelease("VOID")}
                  className="px-3 py-1.5 rounded-md bg-gray-600 text-white text-xs font-semibold disabled:opacity-50"
                >
                  Release → Void (no pay)
                </button>
              </div>
            </div>
          ) : null}

          {locked ? (
            <div className="rounded-lg bg-gray-100 border border-gray-200 p-3 text-xs text-gray-600">
              {earning.status === "PAID"
                ? "This earning has already been paid out — create a DriverAdjustment to correct it."
                : "This earning is attached to a DRAFT payout — cancel the batch before editing."}
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                <div className="text-sm font-semibold text-gray-900">Edit commission</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <label className="text-xs text-gray-600 flex flex-col gap-1">
                    New commission %
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={pct}
                      onChange={(e) => setPct(e.target.value)}
                      className="px-3 py-2 rounded-md border border-gray-200 text-sm"
                    />
                  </label>
                  <KV label="New fee" value={money(newFee)} />
                  <KV label="New driver net" value={money(newNet)} highlight />
                </div>
                <label className="text-xs text-gray-600 flex flex-col gap-1">
                  Internal note (visible to admins only)
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="px-3 py-2 rounded-md border border-gray-200 text-sm"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy || !Number.isFinite(newPct)}
                  onClick={() => onEdit(newPct, notes.trim() || null)}
                  className="px-3 py-2 rounded-md bg-[#C9A063] text-[#1a1a1a] text-sm font-semibold disabled:opacity-50"
                >
                  Save edit
                </button>
              </div>

              <div className="rounded-lg border border-red-200 p-3 space-y-2">
                <div className="text-sm font-semibold text-red-800">Void this earning</div>
                <input
                  type="text"
                  placeholder="Reason (required)"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-red-200 text-sm"
                />
                <button
                  type="button"
                  disabled={busy || !voidReason.trim()}
                  onClick={() => onVoid(voidReason.trim())}
                  className="px-3 py-2 rounded-md bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  Void
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KV({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-md border px-3 py-2 ${
        highlight ? "bg-[#C9A063]/10 border-[#C9A063]/30" : "bg-gray-50 border-gray-100"
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${highlight ? "text-[#8B6914]" : "text-gray-900"}`}>
        {value}
      </div>
    </div>
  );
}

function RemitModal({
  remittance,
  busy,
  onClose,
  onRemit,
  onWaive,
}: {
  remittance: Remittance;
  busy: boolean;
  onClose: () => void;
  onRemit: (method: string, reference: string, notes: string) => void;
  onWaive: (reason: string) => void;
}) {
  const [method, setMethod] = useState("INTERAC");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<"remit" | "waive">("remit");
  const [waiveReason, setWaiveReason] = useState("");

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">COD remittance</h3>
            <p className="text-xs text-gray-500">
              {remittance.driver.name} · {remittance.bookingId}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Amount owed back to company</div>
            <div className="text-2xl font-bold text-gray-900 tabular-nums">
              {money(remittance.amountOwed)}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {remittance.commissionPct.toFixed(1)}% of {money(remittance.serviceBasis)} service basis
            </div>
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode("remit")}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold ${
                mode === "remit" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
              }`}
            >
              Mark remitted
            </button>
            <button
              type="button"
              onClick={() => setMode("waive")}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold ${
                mode === "waive" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
              }`}
            >
              Waive
            </button>
          </div>

          {mode === "remit" ? (
            <>
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
                  <option value="CASH">Cash</option>
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
                Note
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
                onClick={() => onRemit(method, reference, notes)}
                className="w-full px-3 py-2 rounded-md bg-[#C9A063] text-[#1a1a1a] text-sm font-semibold disabled:opacity-50"
              >
                Mark remitted
              </button>
            </>
          ) : (
            <>
              <label className="text-xs text-gray-600 flex flex-col gap-1">
                Waiver reason (required)
                <input
                  type="text"
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  className="px-3 py-2 rounded-md border border-gray-200 text-sm"
                />
              </label>
              <button
                type="button"
                disabled={busy || !waiveReason.trim()}
                onClick={() => onWaive(waiveReason.trim())}
                className="w-full px-3 py-2 rounded-md bg-gray-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                Waive remittance
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
