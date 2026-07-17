"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Radio, Zap, Users, Car, RefreshCw, Power } from "lucide-react";

type BroadcastingRide = {
  bookingId: string;
  customerName: string;
  pickupLocation: string;
  dropoffLocation: string;
  vehicle: string;
  serviceDate: string;
  serviceTime: string;
  createdAt: string;
  offeredTo: number;
};

type DashboardPayload = {
  settings: {
    liveAutoMode: boolean;
    onlyActiveDrivers: boolean;
    updatedAt: string;
  };
  stats: {
    activeDrivers: number;
    openOffers: number;
    broadcastingRides: number;
  };
  broadcasting: BroadcastingRide[];
};

export default function LiveAutoModePage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);
  const [toast, setToast] = useState("");
  const esRef = useRef<EventSource | null>(null);

  const applyDashboard = useCallback((payload: DashboardPayload) => {
    setData(payload);
    setLoading(false);
  }, []);

  const fetchOnce = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ops-settings", { credentials: "include" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load");
      applyDashboard(json);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setLoading(false);
    }
  }, [applyDashboard]);

  useEffect(() => {
    fetchOnce();

    const es = new EventSource("/api/admin/live-auto/stream");
    esRef.current = es;

    es.addEventListener("dashboard", (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as DashboardPayload & {
          type?: string;
        };
        applyDashboard(parsed);
        setLive(true);
      } catch {
        /* ignore */
      }
    });

    es.addEventListener("offer", () => {
      // Offer lifecycle — soft refresh stats via next dashboard frame
      setLive(true);
    });

    es.onerror = () => {
      setLive(false);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [fetchOnce, applyDashboard]);

  const toggleMode = async (next: boolean) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ops-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveAutoMode: next }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Update failed");
      setData((prev) =>
        prev
          ? { ...prev, settings: { ...prev.settings, ...json.settings } }
          : prev
      );
      setToast(
        next
          ? `Live Auto Mode ON${json.broadcastTotal ? ` — offered to ${json.broadcastTotal} driver slots` : ""}`
          : "Live Auto Mode OFF — open offers revoked"
      );
      setTimeout(() => setToast(""), 4000);
      await fetchOnce();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleOnlyActive = async (next: boolean) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ops-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlyActiveDrivers: next }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Update failed");
      setData((prev) =>
        prev
          ? { ...prev, settings: { ...prev.settings, ...json.settings } }
          : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const rebroadcastAll = async () => {
    setBroadcasting(true);
    try {
      const res = await fetch("/api/admin/ops-settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Broadcast failed");
      setToast(`Re-broadcast complete — ${json.offered ?? 0} offers`);
      setTimeout(() => setToast(""), 4000);
      await fetchOnce();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Broadcast failed");
    } finally {
      setBroadcasting(false);
    }
  };

  const on = data?.settings.liveAutoMode ?? false;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
                <Radio className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Live Auto Mode</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              When enabled, new reservations are offered live to every eligible driver. The first to
              accept claims the ride — it disappears instantly from everyone else. No refresh needed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                live ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${live ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {live ? "Live connected" : "Connecting…"}
            </span>
          </div>
        </div>
      </div>

      {toast ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {toast}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Master switch */}
      <div
        className={`rounded-2xl border p-6 mb-6 transition-colors ${
          on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                on ? "bg-white/10" : "bg-slate-100"
              }`}
            >
              <Power className={`w-6 h-6 ${on ? "text-amber-400" : "text-slate-500"}`} />
            </div>
            <div>
              <p className={`text-lg font-bold ${on ? "text-white" : "text-slate-900"}`}>
                {on ? "Live Auto Mode is ON" : "Live Auto Mode is OFF"}
              </p>
              <p className={`text-sm mt-1 ${on ? "text-slate-300" : "text-slate-500"}`}>
                {on
                  ? "New bookings stream to active drivers in real time. First accept wins."
                  : "Drivers only see rides that an admin or OM assigns manually."}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => toggleMode(!on)}
            className={`relative w-16 h-9 rounded-full transition-colors disabled:opacity-50 ${
              on ? "bg-amber-500" : "bg-slate-300"
            }`}
            aria-pressed={on}
            aria-label="Toggle Live Auto Mode"
          >
            <span
              className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow transition-transform ${
                on ? "translate-x-7" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Options + stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2">
            <Users className="w-3.5 h-3.5" /> Active drivers
          </div>
          <p className="text-3xl font-bold text-slate-900">{data?.stats.activeDrivers ?? "—"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2">
            <Zap className="w-3.5 h-3.5" /> Open offers
          </div>
          <p className="text-3xl font-bold text-slate-900">{data?.stats.openOffers ?? "—"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2">
            <Car className="w-3.5 h-3.5" /> Broadcasting now
          </div>
          <p className="text-3xl font-bold text-slate-900">{data?.stats.broadcastingRides ?? "—"}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-slate-900">Only online (active) drivers</p>
            <p className="text-sm text-slate-500 mt-0.5">
              Offer rides only to drivers who have toggled Available in the app.
            </p>
          </div>
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => toggleOnlyActive(!(data?.settings.onlyActiveDrivers ?? true))}
            className={`relative w-14 h-8 rounded-full transition-colors disabled:opacity-50 ${
              data?.settings.onlyActiveDrivers ? "bg-slate-900" : "bg-slate-300"
            }`}
            aria-pressed={data?.settings.onlyActiveDrivers ?? true}
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                data?.settings.onlyActiveDrivers ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-100 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!on || broadcasting}
            onClick={rebroadcastAll}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-40 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${broadcasting ? "animate-spin" : ""}`} />
            Re-broadcast unassigned rides
          </button>
        </div>
      </div>

      {/* Live board */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Live offer board</h2>
            <p className="text-xs text-slate-500 mt-0.5">Rides currently offered to drivers — updates automatically</p>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : !data?.broadcasting?.length ? (
          <div className="p-10 text-center">
            <Radio className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">No rides broadcasting</p>
            <p className="text-xs text-slate-400 mt-1">
              {on
                ? "New pending reservations will appear here instantly."
                : "Turn on Live Auto Mode to start broadcasting."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.broadcasting.map((ride) => (
              <li key={ride.bookingId} className="px-5 py-4 hover:bg-slate-50/80 transition-colors">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        {ride.bookingId}
                      </span>
                      <span className="text-xs text-slate-400">
                        {ride.serviceDate} · {ride.serviceTime}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{ride.customerName}</p>
                    <p className="text-sm text-slate-600 mt-1 truncate">
                      {ride.pickupLocation} → {ride.dropoffLocation}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{ride.vehicle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-slate-900">{ride.offeredTo}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
                      drivers
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">How it works</h3>
        <ol className="space-y-2 text-sm text-slate-600 list-decimal list-inside">
          <li>Enable Live Auto Mode with the switch above.</li>
          <li>When a reservation is created, every eligible online driver receives it live (push + in-app).</li>
          <li>The first driver to Accept claims the ride atomically.</li>
          <li>All other drivers lose the offer instantly — no refresh required.</li>
          <li>Manual assign from Reservations still works and clears competing offers.</li>
        </ol>
      </div>
    </div>
  );
}
