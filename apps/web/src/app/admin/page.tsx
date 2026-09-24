"use client";

import { useState, useEffect, useCallback, useMemo, type CSSProperties } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Car,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Activity,
  MessageSquareText,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Stats {
  totalReservations: number;
  pendingReservations: number;
  unassignedPending?: number;
  activeTrips: number;
  completedTrips: number;
  totalDrivers: number;
  availableDrivers: number;
  totalRevenue: number;
  todayReservations: number;
  yesterdayReservations?: number;
  weekRevenue?: number;
  prevWeekRevenue?: number;
  openSupportTickets?: number;
  appCustomers?: number;
}

interface RecentReservation {
  bookingId: string;
  firstName: string;
  lastName: string;
  status: string;
  serviceDate: string;
  vehicle: string;
  total: number;
  pickupLocation?: string;
}

interface Charts {
  bookingsSeries: { date: string; label: string; bookings: number; revenue: number }[];
  statusBreakdown: { name: string; value: number }[];
  driverBreakdown: { name: string; value: number; fill: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-slate-500/10 text-slate-700 ring-1 ring-slate-500/15",
  ACCEPTED: "bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/15",
  "ON THE WAY": "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/15",
  ARRIVED: "bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/20",
  CIC: "bg-violet-500/10 text-violet-700 ring-1 ring-violet-500/15",
  STOP: "bg-orange-500/10 text-orange-700 ring-1 ring-orange-500/15",
  DONE: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/15",
};

const PIE_PALETTE = [
  "#C9A063",
  "#1C1C1E",
  "#64748b",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
];

const GOLD = "#C9A063";

const GLASS =
  "relative overflow-hidden rounded-[22px] border border-white/70 bg-white/55 shadow-[0_8px_40px_rgba(28,28,30,0.06),0_1px_0_rgba(255,255,255,0.8)_inset] backdrop-blur-2xl backdrop-saturate-150";
const GLASS_DARK =
  "relative overflow-hidden rounded-[22px] border border-white/10 bg-[#1C1C1E] shadow-[0_12px_40px_rgba(0,0,0,0.28),0_1px_0_rgba(255,255,255,0.08)_inset]";
const SPRING =
  "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(28,28,30,0.1)] active:translate-y-0 active:scale-[0.99]";

function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-white/60 bg-white/90 px-3.5 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl">
      {label ? <p className="mb-1 text-[11px] font-semibold tracking-wide text-gray-400">{label}</p> : null}
      {payload.map((p) => (
        <p key={String(p.dataKey || p.name)} className="text-sm font-semibold text-gray-900">
          <span
            className="mr-2 inline-block h-2 w-2 rounded-full"
            style={{ background: p.color || GOLD }}
          />
          {p.name}:{" "}
          {p.dataKey === "revenue" || p.name === "revenue"
            ? money(Number(p.value) || 0)
            : Number(p.value || 0).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function GlassSheen() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent opacity-70"
    />
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentReservations, setRecentReservations] = useState<RecentReservation[]>([]);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [seriesMode, setSeriesMode] = useState<"bookings" | "revenue">("bookings");
  const [mounted, setMounted] = useState(false);

  const fetchData = useCallback(async (soft = false) => {
    try {
      if (soft) setRefreshing(true);
      const res = await fetch("/api/admin/dashboard", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRecentReservations(data.recentReservations || []);
        setCharts(data.charts || null);
        setGeneratedAt(data.generatedAt || null);
        setError("");
      } else {
        const detail = typeof data.actualError === "string" ? data.actualError : "";
        const dbHint = data.dbUrl === "NOT SET" ? " (DATABASE_URL not set on server)" : "";
        setError(
          detail
            ? `${data.error || "Failed to fetch"}: ${detail}${dbHint}`
            : (data.error || "Failed to fetch") + dbHint
        );
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => void fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const bookingDelta = useMemo(
    () => pctDelta(stats?.todayReservations || 0, stats?.yesterdayReservations || 0),
    [stats]
  );
  const revenueDelta = useMemo(
    () => pctDelta(stats?.weekRevenue || 0, stats?.prevWeekRevenue || 0),
    [stats]
  );

  const series = charts?.bookingsSeries || [];
  const statusData = charts?.statusBreakdown || [];
  const driverData = charts?.driverBreakdown || [];

  if (loading) {
    return (
      <div className="relative flex min-h-[60vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(201,160,99,0.12),transparent_50%),radial-gradient(ellipse_at_80%_60%,rgba(28,28,30,0.06),transparent_45%)]" />
        <div className={`${GLASS} px-8 py-7 text-center`}>
          <GlassSheen />
          <Loader2 className="relative mx-auto mb-3 h-8 w-8 animate-spin text-[#C9A063]" />
          <p className="relative text-sm font-medium text-gray-500 tracking-tight">
            Loading command center…
          </p>
        </div>
      </div>
    );
  }

  const rise = (delayMs: number, extra = "") => ({
    className: `dash-fade ${mounted ? "dash-fade-in" : ""} ${extra}`.trim(),
    style: { animationDelay: `${delayMs}ms` } as CSSProperties,
  });

  return (
    <div className="relative isolate min-h-full overflow-hidden px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
      <style>{`
        @keyframes dashRise {
          from { opacity: 0; transform: translateY(12px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dashOrb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(12px, -18px) scale(1.06); }
        }
        .dash-fade { opacity: 0; }
        .dash-fade-in { animation: dashRise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .dash-orb { animation: dashOrb 14s ease-in-out infinite; }
        .dash-orb-slow { animation: dashOrb 20s ease-in-out infinite reverse; }
      `}</style>

      {/* Ambient mesh — iOS wallpaper depth */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="dash-orb absolute -left-24 -top-28 h-72 w-72 rounded-full bg-[#C9A063]/25 blur-[90px]" />
        <div className="dash-orb-slow absolute -right-16 top-24 h-80 w-80 rounded-full bg-sky-300/20 blur-[100px]" />
        <div className="dash-orb absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#1C1C1E]/8 blur-[80px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.9),transparent_55%)]" />
      </div>

      {/* Header — large title */}
      <div {...rise(0, "mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between")}>
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8B6914] shadow-sm backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live operations
          </div>
          <h1 className="text-[34px] font-bold leading-none tracking-[-0.03em] text-[#1C1C1E] sm:text-[40px]">
            Dashboard
          </h1>
          <p className="mt-2 text-[15px] font-medium tracking-tight text-gray-500">
            SARJ Worldwide command center
            {generatedAt ? (
              <>
                {" "}
                <span className="text-gray-300">·</span> updated{" "}
                {new Date(generatedAt).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start rounded-full border border-white/70 bg-white/60 px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-[0_4px_20px_rgba(0,0,0,0.06)] backdrop-blur-xl transition hover:bg-white/80 active:scale-[0.97] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 text-[#C9A063] ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div
          className={`mb-5 flex items-center gap-3 rounded-[18px] border border-red-200/80 bg-red-50/80 p-4 shadow-sm backdrop-blur-xl ${rise(40).className}`}
          style={rise(40).style}
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="flex-1 text-sm text-red-700">{error}</p>
          <button type="button" onClick={() => void fetchData()} className="text-red-600 hover:text-red-800">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Needs attention — tinted glass chips */}
      {(stats?.unassignedPending || 0) > 0 ||
      (stats?.openSupportTickets || 0) > 0 ||
      (stats?.activeTrips || 0) > 0 ? (
        <div {...rise(60, "mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3")}>
          {(stats?.unassignedPending || 0) > 0 ? (
            <Link
              href="/admin/reservations?status=PENDING"
              className={`group flex items-center justify-between rounded-[18px] border border-amber-200/60 bg-amber-50/70 px-4 py-3.5 shadow-sm backdrop-blur-xl ${SPRING}`}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-700/90">
                  Needs assignment
                </p>
                <p className="mt-0.5 text-[22px] font-bold tabular-nums tracking-tight text-amber-950">
                  {stats?.unassignedPending || 0}
                  <span className="ml-1.5 text-sm font-medium text-amber-700">pending</span>
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-600 transition group-hover:translate-x-0.5" />
            </Link>
          ) : null}
          {(stats?.activeTrips || 0) > 0 ? (
            <Link
              href="/admin/live-auto"
              className={`group flex items-center justify-between rounded-[18px] border border-sky-200/60 bg-sky-50/70 px-4 py-3.5 shadow-sm backdrop-blur-xl ${SPRING}`}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sky-700/90">
                  Live now
                </p>
                <p className="mt-0.5 text-[22px] font-bold tabular-nums tracking-tight text-sky-950">
                  {stats?.activeTrips || 0}
                  <span className="ml-1.5 text-sm font-medium text-sky-700">active trips</span>
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-sky-600 transition group-hover:translate-x-0.5" />
            </Link>
          ) : null}
          {(stats?.openSupportTickets || 0) > 0 ? (
            <Link
              href="/admin/support-tickets"
              className={`group flex items-center justify-between rounded-[18px] border border-[#C9A063]/35 bg-[#C9A063]/12 px-4 py-3.5 shadow-sm backdrop-blur-xl ${SPRING}`}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8B6914]">
                  Support inbox
                </p>
                <p className="mt-0.5 text-[22px] font-bold tabular-nums tracking-tight text-gray-900">
                  {stats?.openSupportTickets || 0}
                  <span className="ml-1.5 text-sm font-medium text-[#8B6914]">open</span>
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-[#C9A063] transition group-hover:translate-x-0.5" />
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* KPI row */}
      <div {...rise(100, "mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4")}>
        <Link href="/admin/reservations" className={`${GLASS} ${SPRING} p-5`}>
          <GlassSheen />
          <div className="relative mb-4 flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/5 ring-1 ring-black/5 backdrop-blur-sm">
              <CalendarCheck className="h-5 w-5 text-slate-700" />
            </div>
            {bookingDelta != null ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${
                  bookingDelta >= 0
                    ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/15"
                    : "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/15"
                }`}
              >
                {bookingDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {bookingDelta >= 0 ? "+" : ""}
                {bookingDelta}%
              </span>
            ) : null}
          </div>
          <p className="relative text-[34px] font-bold tabular-nums leading-none tracking-[-0.03em] text-[#1C1C1E]">
            {stats?.todayReservations || 0}
          </p>
          <p className="relative mt-2 text-[15px] font-medium text-gray-500">Bookings today</p>
          <p className="relative mt-1.5 text-xs text-gray-400">
            {stats?.totalReservations || 0} total · {stats?.pendingReservations || 0} pending
          </p>
        </Link>

        <Link href="/admin/live-auto" className={`${GLASS} ${SPRING} p-5`}>
          <GlassSheen />
          <div className="relative mb-4 flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C9A063]/15 ring-1 ring-[#C9A063]/20">
              <Zap className="h-5 w-5 text-[#C9A063]" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-500/15">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500" />
              Live
            </span>
          </div>
          <p className="relative text-[34px] font-bold tabular-nums leading-none tracking-[-0.03em] text-[#1C1C1E]">
            {stats?.activeTrips || 0}
          </p>
          <p className="relative mt-2 text-[15px] font-medium text-gray-500">Active trips</p>
          <p className="relative mt-1.5 text-xs text-gray-400">
            {stats?.completedTrips || 0} completed overall
          </p>
        </Link>

        <Link href="/admin/drivers" className={`${GLASS} ${SPRING} p-5`}>
          <GlassSheen />
          <div className="relative mb-4 flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/15">
              <Users className="h-5 w-5 text-emerald-700" />
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-500/15">
              {stats?.availableDrivers || 0} available
            </span>
          </div>
          <p className="relative text-[34px] font-bold tabular-nums leading-none tracking-[-0.03em] text-[#1C1C1E]">
            {stats?.totalDrivers || 0}
          </p>
          <p className="relative mt-2 text-[15px] font-medium text-gray-500">Drivers</p>
          <p className="relative mt-1.5 text-xs text-gray-400">
            {stats?.appCustomers || 0} app customers
          </p>
        </Link>

        <div className={`${GLASS_DARK} ${SPRING} p-5`}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#2C2C2E] via-[#1C1C1E] to-[#141416]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[#C9A063]/30 blur-3xl"
          />
          <div className="relative mb-4 flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C9A063]/20 ring-1 ring-[#C9A063]/25">
              <DollarSign className="h-5 w-5 text-[#C9A063]" />
            </div>
            {revenueDelta != null ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  revenueDelta >= 0
                    ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/20"
                    : "bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20"
                }`}
              >
                {revenueDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {revenueDelta >= 0 ? "+" : ""}
                {revenueDelta}% WoW
              </span>
            ) : null}
          </div>
          <p className="relative text-[34px] font-bold tabular-nums leading-none tracking-[-0.03em] text-white">
            {money(stats?.totalRevenue || 0)}
          </p>
          <p className="relative mt-2 text-[15px] font-medium text-white/70">Total revenue</p>
          <p className="relative mt-1.5 text-xs text-white/45">
            This week {money(stats?.weekRevenue || 0)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div {...rise(160, "mb-5 grid grid-cols-1 gap-4 xl:grid-cols-3")}>
        <div className={`${GLASS} p-5 xl:col-span-2`}>
          <GlassSheen />
          <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-[#1C1C1E]">
                Performance
              </h2>
              <p className="text-[13px] text-gray-500">Last 14 days · hover for detail</p>
            </div>
            {/* iOS segmented control */}
            <div className="relative inline-flex rounded-full bg-black/[0.06] p-1 ring-1 ring-black/[0.04]">
              <button
                type="button"
                onClick={() => setSeriesMode("bookings")}
                className={`relative z-10 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all duration-300 ${
                  seriesMode === "bookings"
                    ? "bg-white text-[#1C1C1E] shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Bookings
              </button>
              <button
                type="button"
                onClick={() => setSeriesMode("revenue")}
                className={`relative z-10 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all duration-300 ${
                  seriesMode === "revenue"
                    ? "bg-white text-[#1C1C1E] shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Revenue
              </button>
            </div>
          </div>
          <div className="relative h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(v) => (seriesMode === "revenue" ? `$${v}` : String(v))}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey={seriesMode}
                  name={seriesMode}
                  stroke={GOLD}
                  strokeWidth={2.5}
                  fill="url(#dashFill)"
                  activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: GOLD }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${GLASS} p-5`}>
          <GlassSheen />
          <div className="relative mb-2">
            <h2 className="text-[17px] font-semibold tracking-tight text-[#1C1C1E]">Status mix</h2>
            <p className="text-[13px] text-gray-500">All reservations by status</p>
          </div>
          <div className="relative h-[200px] w-full">
            {statusData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={80}
                    paddingAngle={3}
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth={3}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="relative mt-1 max-h-24 space-y-1.5 overflow-y-auto">
            {statusData.slice(0, 6).map((s, i) => (
              <div key={s.name} className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-gray-600">
                  <span
                    className="h-2 w-2 rounded-full shadow-sm"
                    style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }}
                  />
                  {s.name}
                </span>
                <span className="font-semibold tabular-nums text-[#1C1C1E]">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div {...rise(220, "mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3")}>
        <div className={`${GLASS} p-5`}>
          <GlassSheen />
          <div className="relative mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-[#1C1C1E]">
                Driver fleet
              </h2>
              <p className="text-[13px] text-gray-500">Availability snapshot</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A063]/15">
              <Car className="h-4 w-4 text-[#C9A063]" />
            </div>
          </div>
          <div className="relative h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={driverData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Drivers" radius={[10, 10, 6, 6]}>
                  {driverData.map((d) => (
                    <Cell key={d.name} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${GLASS} p-5 lg:col-span-2`}>
          <GlassSheen />
          <div className="relative mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-[#1C1C1E]">
                Recent reservations
              </h2>
              <p className="text-[13px] text-gray-500">Latest bookings across the platform</p>
            </div>
            <Link
              href="/admin/reservations"
              className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-3 py-1.5 text-[13px] font-semibold text-[#C9A063] transition hover:bg-[#C9A063]/12"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentReservations.length === 0 ? (
            <div className="relative py-10 text-center">
              <CalendarCheck className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No reservations yet</p>
            </div>
          ) : (
            <div className="relative divide-y divide-black/[0.04] overflow-hidden rounded-2xl bg-white/40 ring-1 ring-black/[0.04]">
              {recentReservations.map((r) => (
                <Link
                  key={r.bookingId}
                  href={`/admin/reservations?q=${encodeURIComponent(r.bookingId)}`}
                  className="flex items-center justify-between gap-3 px-3.5 py-3.5 transition hover:bg-white/70"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold tracking-tight text-[#1C1C1E]">
                      {r.firstName} {r.lastName}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                      <span className="font-semibold text-[#C9A063]">{r.bookingId}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {r.serviceDate}
                      </span>
                      <span className="inline-flex items-center gap-1 truncate">
                        <Car className="h-3 w-3 shrink-0" /> {r.vehicle}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-sm font-bold tabular-nums tracking-tight text-[#1C1C1E]">
                      {r.total > 0 ? `$${r.total.toFixed(2)}` : "—"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        STATUS_COLORS[r.status] || STATUS_COLORS.PENDING
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div {...rise(280, "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4")}>
        {[
          {
            href: "/admin/reservations",
            icon: CalendarCheck,
            title: "Reservations",
            desc: "Assign & manage trips",
          },
          {
            href: "/admin/live-auto",
            icon: Activity,
            title: "Live Auto",
            desc: "Watch active dispatch",
          },
          {
            href: "/admin/drivers",
            icon: Car,
            title: "Drivers",
            desc: "Fleet & availability",
          },
          {
            href: "/admin/support-tickets",
            icon: MessageSquareText,
            title: "Support",
            desc:
              (stats?.openSupportTickets || 0) > 0
                ? `${stats?.openSupportTickets} open tickets`
                : "Customer messages",
          },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.href} href={a.href} className={`group ${GLASS} ${SPRING} p-5`}>
              <GlassSheen />
              <div className="relative mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C9A063]/12 ring-1 ring-[#C9A063]/20 transition group-hover:scale-110 group-hover:bg-[#C9A063]/20">
                <Icon className="h-5 w-5 text-[#C9A063]" />
              </div>
              <h3 className="relative text-[15px] font-semibold tracking-tight text-[#1C1C1E] transition group-hover:text-[#C9A063]">
                {a.title}
              </h3>
              <p className="relative mt-0.5 text-[13px] text-gray-500">{a.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
