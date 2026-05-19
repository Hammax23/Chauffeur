"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  UserPlus,
  Search,
  Filter,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import DriverStatusBadge, { driverStatusLabel } from "@/components/DriverStatusBadge";
import DriverTripTimingPanel from "@/components/DriverTripTimingPanel";
import { isDriverLockedOnAnotherReservation } from "@/lib/reservation-driver-assignment";

interface AssignedDriver {
  id: string;
  name: string;
  phone?: string;
  vehicle?: string;
  vehiclePlate?: string;
  status?: string | null;
}

interface ReservationRow {
  bookingId: string;
  status: string;
  firstName: string;
  lastName: string;
  serviceDate: string;
  serviceTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  assignedDriverId?: string | null;
  assignedDriver?: AssignedDriver | null;
  driverOnTheWayAt?: string | null;
  driverStopPeriodsJson?: string | null;
  completedAt?: string | null;
}

interface DriverOption {
  id: string;
  name: string;
  vehicle: string;
  vehiclePlate: string;
  isActive: boolean;
  status: string;
}

export default function OperationalManagerPage() {
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [pickDriver, setPickDriver] = useState<Record<string, string>>({});
  const [assigning, setAssigning] = useState<string | null>(null);
  const [expandedTripTiming, setExpandedTripTiming] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [resRes, drvRes] = await Promise.all([
        fetch("/api/operational-manager/reservations", { credentials: "include" }),
        fetch("/api/operational-manager/drivers", { credentials: "include" }),
      ]);
      const resData = await resRes.json();
      const drvData = await drvRes.json();
      if (resData.success) setReservations(resData.reservations || []);
      else setError(resData.error || "Failed to load reservations");
      if (drvData.success) setDrivers(drvData.drivers || []);
      else if (!resData.success) setError((e) => e || drvData.error || "Failed to load drivers");
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPickDriver((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [bookingId, driverId] of Object.entries(next)) {
        if (isDriverLockedOnAnotherReservation(driverId, bookingId, reservations)) {
          delete next[bookingId];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [reservations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reservations.filter((r) => {
      if (filterUnassigned && r.assignedDriverId) return false;
      if (!q) return true;
      return (
        r.bookingId?.toLowerCase().includes(q) ||
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        r.pickupLocation?.toLowerCase().includes(q) ||
        r.dropoffLocation?.toLowerCase().includes(q)
      );
    });
  }, [reservations, search, filterUnassigned]);

  const assign = async (bookingId: string) => {
    const driverId = pickDriver[bookingId]?.trim();
    if (!driverId) {
      setError("Select a driver first");
      return;
    }
    if (isDriverLockedOnAnotherReservation(driverId, bookingId, reservations)) {
      setError("That driver is already booked on another active reservation.");
      return;
    }
    setAssigning(bookingId);
    setError("");
    try {
      const res = await fetch("/api/operational-manager/reservations/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bookingId, driverId }),
      });
      const data = await res.json();
      if (data.success) {
        await load(true);
        setPickDriver((prev) => {
          const next = { ...prev };
          delete next[bookingId];
          return next;
        });
      } else {
        setError(data.error || "Assignment failed");
      }
    } catch {
      setError("Assignment failed");
    } finally {
      setAssigning(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A063]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 text-gray-900 [color-scheme:light]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed max-w-xl">
            Select a driver and assign to a booking. Drivers receive a push notification when assigned.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search booking, name, or address…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/25 focus:border-[#C9A063]"
          />
        </div>
        <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl bg-white cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterUnassigned}
            onChange={(e) => setFilterUnassigned(e.target.checked)}
            className="rounded border-gray-300 text-[#C9A063] focus:ring-[#C9A063]"
          />
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-900">Unassigned only</span>
        </label>
      </div>

      {error && (
        <div className="mb-4 flex gap-2 text-red-700 bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-800 uppercase tracking-wide">
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3 hidden md:table-cell">When</th>
                <th className="px-4 py-3 min-w-[180px]">Route</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden lg:table-cell">Current driver</th>
                <th className="px-4 py-3 min-w-[220px]">Assign</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-600">
                    No reservations match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <Fragment key={r.bookingId}>
                  <tr className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 align-top">
                      <span className="font-mono text-xs font-semibold text-gray-900">{r.bookingId}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTripTiming((prev) =>
                            prev === r.bookingId ? null : r.bookingId
                          )
                        }
                        className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-[#C9A063] hover:text-[#a07838]"
                      >
                        Trip timing
                        {expandedTripTiming === r.bookingId ? (
                          <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                        )}
                      </button>
                      <div className="text-xs text-gray-800 mt-1 md:hidden flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-gray-600" />
                        {r.serviceDate} {r.serviceTime}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-900 hidden md:table-cell whitespace-nowrap">
                      <div className="flex items-start gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-600 mt-0.5 shrink-0" />
                        <span>
                          {r.serviceDate}
                          <br />
                          <span className="text-gray-800 font-medium">{r.serviceTime}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-900">
                      <div className="flex gap-1.5">
                        <MapPin className="w-4 h-4 text-[#C9A063] shrink-0 mt-0.5" />
                        <span className="line-clamp-2">
                          {r.pickupLocation}
                          <span className="text-gray-600 font-medium"> → </span>
                          {r.dropoffLocation}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-flex px-2 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-800">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-900 hidden lg:table-cell">
                      {r.assignedDriver ? (
                        <div className="flex flex-col gap-2 items-start max-w-[220px]">
                          <DriverStatusBadge status={r.assignedDriver.status} />
                          <div>
                            <span className="font-medium">{r.assignedDriver.name}</span>
                            <span className="block text-xs text-gray-700 font-medium mt-0.5">
                              {r.assignedDriver.vehiclePlate}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-amber-700 font-medium">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <div className="flex flex-1 min-w-0 flex-col sm:flex-row gap-2 sm:items-center">
                          <select
                            value={pickDriver[r.bookingId] ?? ""}
                            onChange={(e) =>
                              setPickDriver((prev) => ({ ...prev, [r.bookingId]: e.target.value }))
                            }
                            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 [&>option]:bg-white [&>option]:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/25 focus:border-[#C9A063]"
                          >
                            <option value="">Select driver…</option>
                            {drivers.map((d) => {
                              const locked = isDriverLockedOnAnotherReservation(
                                d.id,
                                r.bookingId,
                                reservations
                              );
                              return (
                                <option key={d.id} value={d.id} disabled={locked}>
                                  {locked
                                    ? `${d.name} · ${d.vehiclePlate} · Booked`
                                    : `${d.name} · ${d.vehiclePlate} · ${driverStatusLabel(d.status)}`}
                                </option>
                              );
                            })}
                          </select>
                          {pickDriver[r.bookingId] &&
                          !isDriverLockedOnAnotherReservation(
                            pickDriver[r.bookingId],
                            r.bookingId,
                            reservations
                          ) ? (
                            <DriverStatusBadge
                              className="shrink-0"
                              status={drivers.find((d) => d.id === pickDriver[r.bookingId])?.status}
                            />
                          ) : null}
                        </div>
                        <button
                          type="button"
                          disabled={
                            assigning === r.bookingId ||
                            !pickDriver[r.bookingId] ||
                            isDriverLockedOnAnotherReservation(
                              pickDriver[r.bookingId],
                              r.bookingId,
                              reservations
                            )
                          }
                          onClick={() => assign(r.bookingId)}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#B8904F] text-white text-sm font-bold shadow-sm hover:bg-[#a07838] disabled:opacity-50 whitespace-nowrap ring-1 ring-black/10"
                        >
                          {assigning === r.bookingId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserPlus className="w-4 h-4" />
                          )}
                          Assign
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedTripTiming === r.bookingId ? (
                    <tr className="bg-[#FFFDF9] border-t border-[#C9A063]/25">
                      <td colSpan={6} className="px-4 py-4">
                        <DriverTripTimingPanel
                          status={r.status}
                          driverOnTheWayAt={r.driverOnTheWayAt}
                          driverStopPeriodsJson={r.driverStopPeriodsJson}
                          completedAt={r.completedAt}
                          className="shadow-sm"
                        />
                      </td>
                    </tr>
                  ) : null}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
