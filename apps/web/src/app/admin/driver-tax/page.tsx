// @ts-nocheck
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  Download,
  PlayCircle,
  Database,
  Users,
} from "lucide-react";

type TaxRow = {
  driverId: string;
  driverCode: string;
  driverName: string;
  driverEmail: string;
  year: number;
  totalPaid: number;
  earningsPaid: number;
  adjustmentsTotal: number;
  earningsCount: number;
  adjustmentsCount: number;
  generatedAt: string;
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

function torontoYear(): number {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric" });
  return Number(fmt.format(new Date())) || new Date().getUTCFullYear();
}

export default function AdminDriverTaxPage() {
  const currentYear = torontoYear();
  const [year, setYear] = useState<number>(currentYear);
  const [rows, setRows] = useState<TaxRow[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [summary, setSummary] = useState<{ driverCount: number; totalPaid: number } | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [live, setLive] = useState<boolean>(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (nextYear: number, opts?: { live?: boolean }) => {
      setRefreshing(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("year", String(nextYear));
        if (opts?.live) params.set("live", "1");
        const res = await fetch(`/api/admin/driver-tax?${params}`, { credentials: "include" });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || "Failed to load");
          return;
        }
        setRows(data.rows || []);
        setSummary(data.summary || null);
        setAvailableYears(
          Array.isArray(data.availableYears) && data.availableYears.length
            ? data.availableYears
            : [nextYear]
        );
        setLive(!!opts?.live);
      } catch {
        setError("Failed to connect to server");
      } finally {
        setRefreshing(false);
        setInitialLoad(false);
      }
    },
    []
  );

  useEffect(() => {
    void load(year);
  }, [year, load]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/driver-tax", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to generate");
        return;
      }
      await load(year);
    } finally {
      setGenerating(false);
    }
  };

  const downloadCsv = () => {
    const params = new URLSearchParams({ year: String(year), format: "csv" });
    const url = `/api/admin/driver-tax?${params}`;
    window.location.href = url;
  };

  const years = useMemo(() => {
    const set = new Set<number>(availableYears);
    for (let y = currentYear; y >= currentYear - 5; y--) set.add(y);
    return Array.from(set).sort((a, b) => b - a);
  }, [availableYears, currentYear]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1500px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
            Driver Tax (T4A)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Canadian contractor annual summaries in America/Toronto calendar year. Not a CRA
            e-file — generate &amp; export the CSV for your accountant.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load(year, { live: true })}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            title="Compute from the ledger without persisting"
          >
            <PlayCircle className="w-4 h-4" />
            Live preview
          </button>
          <button
            type="button"
            onClick={() => void load(year)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-[#C9A063] text-[#1a1a1a] text-sm font-semibold hover:brightness-95 disabled:opacity-50"
          >
            <Database className="w-4 h-4" />
            {generating ? "Generating…" : "Generate / refresh"}
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:brightness-110"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <SummaryCard
          icon={<Users className="w-4 h-4 text-[#C9A063]" />}
          label="Drivers with activity"
          value={summary ? String(summary.driverCount) : "—"}
          hint={live ? "Live (ledger — not persisted)" : "Persisted snapshot"}
        />
        <SummaryCard
          icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          label={`Total paid ${year}`}
          value={summary ? money(summary.totalPaid) : "—"}
          hint="Net earnings + adjustments (CAD)"
        />
      </div>

      <div className="rounded-xl border border-gray-200/80 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
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
        ) : rows.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-600">
              No tax rows for {year}.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Click <span className="font-semibold">Generate / refresh</span> to compute and
              persist a snapshot, or <span className="font-semibold">Live preview</span> to
              see the current ledger totals without saving.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="text-left px-4 py-3">Driver</th>
                  <th className="text-right px-4 py-3">Earnings paid</th>
                  <th className="text-right px-4 py-3">Adjustments</th>
                  <th className="text-right px-4 py-3">Total paid</th>
                  <th className="text-left px-4 py-3">Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.driverId} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{r.driverName}</div>
                      <div className="text-[11px] text-gray-500">
                        {r.driverCode} · {r.driverEmail}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {money(r.earningsPaid)}
                      <div className="text-[10px] text-gray-500">
                        {r.earningsCount} earnings
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${
                        r.adjustmentsTotal < 0
                          ? "text-red-700"
                          : r.adjustmentsTotal > 0
                            ? "text-emerald-700"
                            : "text-gray-700"
                      }`}
                    >
                      {r.adjustmentsTotal >= 0 ? "+" : "−"}
                      {money(Math.abs(r.adjustmentsTotal))}
                      <div className="text-[10px] text-gray-500">
                        {r.adjustmentsCount} items
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-gray-900">
                      {money(r.totalPaid)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatWhen(r.generatedAt)}
                      {live ? (
                        <div className="text-[10px] text-amber-700">(live preview)</div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
