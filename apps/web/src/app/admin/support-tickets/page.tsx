"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Loader2,
  AlertCircle,
  MessageSquareText,
  RefreshCw,
  Mail,
  Phone,
  X,
  ChevronRight,
} from "lucide-react";

type TicketRow = {
  id: string;
  ticketId: string;
  type: string;
  subject: string | null;
  message: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
};

type Summary = {
  total: number;
  new: number;
  inProgress: number;
  resolved: number;
  closed: number;
};

const STATUS_OPTIONS = ["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function statusStyle(status: string) {
  switch (status) {
    case "NEW":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "IN_PROGRESS":
      return "bg-sky-50 text-sky-800 border-sky-200";
    case "RESOLVED":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "CLOSED":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

export default function AdminSupportTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | (typeof STATUS_OPTIONS)[number]>("ALL");
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 280);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const load = useCallback(async () => {
    try {
      setError("");
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (debouncedQ) params.set("q", debouncedQ);
      const res = await fetch(`/api/admin/support-tickets?${params}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to load");
        return;
      }
      setTickets(data.tickets || []);
      setSummary(data.summary || null);
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, statusFilter]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (selected) setAdminNote(selected.adminNote || "");
  }, [selected]);

  const openCount = useMemo(
    () => (summary ? summary.new + summary.inProgress : 0),
    [summary]
  );

  const stats = useMemo(
    () => [
      { label: "Total", value: summary?.total ?? 0 },
      { label: "New", value: summary?.new ?? 0 },
      { label: "In progress", value: summary?.inProgress ?? 0 },
      { label: "Resolved", value: summary?.resolved ?? 0 },
      { label: "Closed", value: summary?.closed ?? 0 },
    ],
    [summary]
  );

  async function updateStatus(status: string) {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/support-tickets/${selected.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote }),
      });
      const data = await res.json();
      if (!data.success) {
        setToast(data.error || "Update failed");
        return;
      }
      setSelected(data.ticket);
      setToast("Ticket updated");
      await load();
    } catch {
      setToast("Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5">
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
            Support Tickets
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            In-app Contact Us messages
            {summary ? (
              <>
                {" "}
                · <span className="font-medium text-gray-700">{openCount} open</span>
              </>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats — single strip, no card gaps */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 sm:grid-cols-5 sm:divide-y-0">
          {stats.map((s) => (
            <div key={s.label} className="px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                {s.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters + list in one panel */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-100 p-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticket, customer, message…"
              className="w-full rounded-lg border border-gray-200 bg-gray-50/80 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#C9A063] focus:bg-white focus:ring-2 focus:ring-[#C9A063]/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="w-full shrink-0 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm outline-none focus:border-[#C9A063] focus:bg-white sm:w-44"
          >
            <option value="ALL">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading tickets…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-gray-500">
            <AlertCircle className="h-7 w-7 text-red-300" />
            <p className="text-sm">Could not load tickets</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-gray-500">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
              <MessageSquareText className="h-6 w-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-600">No support tickets yet</p>
            <p className="max-w-xs text-center text-xs text-gray-400">
              When customers submit Contact Us in the app, tickets appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tickets.map((t) => {
              const name = `${t.customer.firstName} ${t.customer.lastName}`.trim();
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(t)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#FAF8F4]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">{t.ticketId}</span>
                        <span
                          className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusStyle(t.status)}`}
                        >
                          {statusLabel(t.status)}
                        </span>
                        <span className="text-xs font-medium text-[#A87830]">{t.type}</span>
                      </div>
                      <p className="mt-1 truncate text-sm text-gray-800">
                        {t.subject || t.message}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {name} · {t.customer.email} · {formatWhen(t.createdAt)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#C9A063]">
                  Support ticket
                </p>
                <h2 className="text-lg font-semibold text-gray-900">{selected.ticketId}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-4">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase ${statusStyle(selected.status)}`}
                >
                  {statusLabel(selected.status)}
                </span>
                <span className="inline-flex rounded-md border border-[#C9A063]/30 bg-[#C9A063]/10 px-2 py-0.5 text-[11px] font-semibold text-[#8B6914]">
                  {selected.type}
                </span>
              </div>

              <div className="rounded-xl border border-gray-100 bg-[#FAF8F4] p-3.5">
                <p className="font-semibold text-gray-900">
                  {selected.customer.firstName} {selected.customer.lastName}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {selected.customer.email}
                </p>
                {selected.customer.phone ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {selected.customer.phone}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-gray-400">
                  Submitted {formatWhen(selected.createdAt)}
                </p>
              </div>

              {selected.subject ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                    Subject
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{selected.subject}</p>
                </div>
              ) : null}

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                  Message
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                  {selected.message}
                </p>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                  Admin note
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#C9A063]"
                  placeholder="Internal note…"
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void updateStatus(selected.status)}
                  className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Save note
                </button>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                  Update status
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={saving}
                      onClick={() => void updateStatus(s)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold border transition ${
                        selected.status === s
                          ? "border-[#C9A063] bg-[#C9A063] text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {statusLabel(s)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </div>
  );
}
