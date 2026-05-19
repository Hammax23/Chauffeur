"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AlertCircle, Loader2, MapPin, Search, Users, Clock, Navigation } from "lucide-react";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";
import { DriverFleetMap, FleetMapDriver } from "@/components/DriverFleetMap";

type TrackedDriver = {
  id: string;
  driverId: string;
  name: string;
  email: string;
  phone: string;
  vehicle: string;
  vehiclePlate: string;
  status: string;
  isActive: boolean;
  photo: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastLocationAccuracy: number | null;
  lastLocationHeading: number | null;
  lastLocationSpeed: number | null;
  lastLocationUpdatedAt: string | null;
};

const POLL_MS = 5000;

function minutesSince(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / 60000);
}

function mapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default function TrackDriversPage() {
  return (
    <GoogleMapsProvider>
      <TrackDriversContent />
    </GoogleMapsProvider>
  );
}

function TrackDriversContent() {
  const [drivers, setDrivers] = useState<TrackedDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [focusDriverId, setFocusDriverId] = useState<string | null>(null);

  const fetchDrivers = useCallback(async (silent = false) => {
    try {
      const res = await fetch("/api/admin/driver-locations");
      const data = await res.json();
      if (data.success) {
        setDrivers(data.drivers || []);
        setError("");
      } else {
        setError(data.error || "Failed to fetch");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  useEffect(() => {
    const t = setInterval(() => fetchDrivers(true), POLL_MS);
    return () => clearInterval(t);
  }, [fetchDrivers]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) => {
      const name = `${d.name}`.toLowerCase();
      return (
        name.includes(q) ||
        d.driverId.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q) ||
        d.vehicle.toLowerCase().includes(q) ||
        d.vehiclePlate.toLowerCase().includes(q)
      );
    });
  }, [drivers, searchQuery]);

  const fleetForMap: FleetMapDriver[] = useMemo(() => {
    return filtered
      .filter((d) => typeof d.lastLatitude === "number" && typeof d.lastLongitude === "number")
      .map((d) => ({
        id: d.id,
        name: d.name,
        photo: d.photo,
        lastLatitude: d.lastLatitude,
        lastLongitude: d.lastLongitude,
        lastLocationHeading: d.lastLocationHeading,
        lastLocationUpdatedAt: d.lastLocationUpdatedAt,
      }));
  }, [filtered]);

  const withLocation = useMemo(
    () => drivers.filter((d) => typeof d.lastLatitude === "number" && typeof d.lastLongitude === "number"),
    [drivers]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#C9A063]" />
          <p className="text-sm text-gray-500">Loading driver locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col p-4 sm:p-6 lg:p-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">Track Drivers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Live fleet map — all drivers on one screen · refreshes every {POLL_MS / 1000}s
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchDrivers()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          <Navigation className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
              <p className="text-xs text-gray-500">Registered drivers</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C9A063]/10">
              <MapPin className="h-5 w-5 text-[#C9A063]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{withLocation.length}</p>
              <p className="text-xs text-gray-500">On map</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {withLocation.filter((d) => (minutesSince(d.lastLocationUpdatedAt) ?? 999) <= 2).length}
              </p>
              <p className="text-xs text-gray-500">Live (last 2 min)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search driver, vehicle, plate, phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#C9A063] focus:outline-none focus:ring-2 focus:ring-[#C9A063]/10"
        />
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="relative min-h-[min(65dvh,560px)] flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-[#e8eef5] shadow-sm lg:min-h-[calc(100dvh-22rem)]">
          <DriverFleetMap drivers={fleetForMap} focusDriverId={focusDriverId} />
        </div>

        <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:w-[340px] lg:max-w-[340px]">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">Drivers ({filtered.length})</p>
            <p className="text-xs text-gray-500">Tap a driver to focus on the map</p>
          </div>
          <div className="max-h-[min(40dvh,420px)] overflow-y-auto lg:max-h-none lg:flex-1">
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <MapPin className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p className="text-sm text-gray-500">No drivers match your search</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filtered.map((d) => {
                  const hasLoc =
                    typeof d.lastLatitude === "number" && typeof d.lastLongitude === "number";
                  const mins = minutesSince(d.lastLocationUpdatedAt);
                  const fresh = mins !== null && mins <= 2;
                  const active = focusDriverId === d.id;
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        disabled={!hasLoc}
                        onClick={() => {
                          if (!hasLoc) return;
                          setFocusDriverId(d.id);
                        }}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                          hasLoc ? "cursor-pointer hover:bg-gray-50" : "cursor-not-allowed opacity-60"
                        } ${active ? "bg-[#C9A063]/10" : ""}`}
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#C9A063] to-[#A68B5B]">
                          {d.photo ? (
                            <Image src={d.photo} alt="" width={40} height={40} className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                              {d.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </span>
                          )}
                          {hasLoc && (
                            <span
                              className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white ${
                                fresh ? "bg-emerald-500" : "bg-gray-400"
                              }`}
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-gray-900">{d.name}</p>
                          <p className="truncate text-xs text-gray-500">
                            {d.vehiclePlate} · {d.isActive ? "Active" : "Off"}
                          </p>
                          {!hasLoc ? (
                            <p className="mt-0.5 text-xs text-amber-700">Location off</p>
                          ) : (
                            <p className="mt-0.5 text-xs text-gray-500">
                              {fresh ? "Live" : mins !== null ? `${mins}m ago` : "—"}
                            </p>
                          )}
                        </div>
                        {hasLoc && (
                          <a
                            href={mapsLink(d.lastLatitude as number, d.lastLongitude as number)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[#C9A063] hover:bg-[#C9A063]/10"
                          >
                            Maps
                          </a>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
