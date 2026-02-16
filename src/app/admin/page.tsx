"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, Filter, ExternalLink, Phone, Mail,
  Car, MapPin, Clock, Users, ChevronDown, ChevronUp,
  Loader2, AlertCircle, CheckCircle2, Eye
} from "lucide-react";

const STATUS_OPTIONS = ["ALL", "PENDING", "ON THE WAY", "ARRIVED", "CIC", "DONE"];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  PENDING: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" },
  "ON THE WAY": { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  ARRIVED: { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
  CIC: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  DONE: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
};

interface Reservation {
  bookingId: string;
  dateSubmitted: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  serviceType: string;
  vehicle: string;
  passengers: number;
  childSeats: number;
  childSeatType: string;
  etr407: string;
  serviceDate: string;
  serviceTime: string;
  pickupLocation: string;
  stops: string;
  dropoffLocation: string;
  distance: string;
  duration: string;
  airline: string;
  flightNumber: string;
  flightNote: string;
  rideFare: number;
  stopCharge: number;
  childSeatCharge: number;
  subtotal: number;
  hst: number;
  gratuity: number;
  total: number;
  specialRequirements: string;
  driverLink: string;
  trackLink: string;
}

export default function AdminPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReservations = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/reservations");
      const data = await res.json();
      if (data.success) {
        setReservations(data.reservations || []);
        setError("");
      } else {
        setError(data.error || "Failed to fetch");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
    const interval = setInterval(() => fetchReservations(), 30000);
    return () => clearInterval(interval);
  }, [fetchReservations]);

  const filtered = reservations.filter((r) => {
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      r.bookingId?.toLowerCase().includes(query) ||
      r.firstName?.toLowerCase().includes(query) ||
      r.lastName?.toLowerCase().includes(query) ||
      r.phone?.toLowerCase().includes(query) ||
      r.email?.toLowerCase().includes(query) ||
      r.pickupLocation?.toLowerCase().includes(query) ||
      r.dropoffLocation?.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const statusCounts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = s === "ALL" ? reservations.length : reservations.filter((r) => r.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#C9A063] mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1C1C1E] to-[#2C2C2E] text-white">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-[#C9A063] rounded-lg flex items-center justify-center">
                  <Car className="w-4 h-4 text-white" />
                </div>
                <span className="text-[#C9A063] text-xs font-semibold tracking-widest uppercase">SARJ Admin</span>
              </div>
              <h1 className="text-2xl font-bold">Reservation Dashboard</h1>
              <p className="text-gray-400 text-sm mt-1">Live tracking for all reservations</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right mr-4 hidden sm:block">
                <p className="text-gray-400 text-xs">Total Reservations</p>
                <p className="text-3xl font-bold text-[#C9A063]">{reservations.length}</p>
              </div>
              <button
                onClick={() => fetchReservations(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {STATUS_OPTIONS.map((s) => {
            const colors = s === "ALL" ? { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" } : STATUS_COLORS[s] || STATUS_COLORS.PENDING;
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? `${colors.bg} ${colors.text} ring-2 ring-offset-1 ring-[#C9A063]`
                    : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                {s} ({statusCounts[s]})
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by booking ID, name, phone, email, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10 transition-all"
          />
        </div>

        {error && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Reservations Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-[180px_1fr_1fr_140px_120px_100px_90px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Booking ID</span>
            <span>Passenger</span>
            <span>Route</span>
            <span>Date & Time</span>
            <span>Vehicle</span>
            <span>Total</span>
            <span>Status</span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Filter className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No reservations found</p>
              <p className="text-gray-400 text-xs mt-1">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((r) => {
                const isExpanded = expandedRow === r.bookingId;
                const statusStyle = STATUS_COLORS[r.status] || STATUS_COLORS.PENDING;
                return (
                  <div key={r.bookingId}>
                    {/* Row */}
                    <div
                      onClick={() => setExpandedRow(isExpanded ? null : r.bookingId)}
                      className="grid grid-cols-1 lg:grid-cols-[180px_1fr_1fr_140px_120px_100px_90px] gap-2 lg:gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors items-center"
                    >
                      {/* Booking ID */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#C9A063]">{r.bookingId}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>

                      {/* Passenger */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{r.firstName} {r.lastName}</p>
                          <p className="text-xs text-gray-500 truncate">{r.phone}</p>
                        </div>
                      </div>

                      {/* Route */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <p className="text-xs text-gray-600 truncate">{r.pickupLocation}</p>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />
                          <p className="text-xs text-gray-600 truncate">{r.dropoffLocation}</p>
                        </div>
                      </div>

                      {/* Date */}
                      <div>
                        <p className="text-sm text-gray-900">{r.serviceDate}</p>
                        <p className="text-xs text-gray-500">{r.serviceTime}</p>
                      </div>

                      {/* Vehicle */}
                      <p className="text-sm text-gray-700 truncate">{r.vehicle}</p>

                      {/* Total */}
                      <p className="text-sm font-bold text-gray-900">
                        {typeof r.total === "number" && r.total > 0 ? `$${r.total.toFixed(2)}` : "--"}
                      </p>

                      {/* Status */}
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} w-fit`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} ${r.status !== "DONE" ? "animate-pulse" : ""}`} />
                        {r.status}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-5 pb-5 bg-gray-50/50 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
                          {/* Contact */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</h4>
                            <div className="space-y-1.5">
                              <a href={`mailto:${r.email}`} className="flex items-center gap-2 text-sm text-[#C9A063] hover:underline">
                                <Mail className="w-3.5 h-3.5" /> {r.email}
                              </a>
                              <a href={`tel:${r.phone}`} className="flex items-center gap-2 text-sm text-[#C9A063] hover:underline">
                                <Phone className="w-3.5 h-3.5" /> {r.phone}
                              </a>
                            </div>
                          </div>

                          {/* Trip Info */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Trip Details</h4>
                            <div className="text-sm text-gray-700 space-y-1">
                              {r.serviceType && <p><span className="text-gray-500">Service:</span> {r.serviceType}</p>}
                              <p><span className="text-gray-500">Passengers:</span> {r.passengers}</p>
                              {r.childSeats > 0 && <p><span className="text-gray-500">Child Seats:</span> {r.childSeats} {r.childSeatType ? `(${r.childSeatType})` : ""}</p>}
                              {r.etr407 === "Yes" && <p><span className="text-gray-500">407 ETR:</span> <span className="text-[#C9A063] font-semibold">Yes</span></p>}
                              {r.distance && <p><span className="text-gray-500">Distance:</span> {r.distance}</p>}
                              {r.duration && <p><span className="text-gray-500">Duration:</span> {r.duration}</p>}
                              {r.stops && <p><span className="text-gray-500">Stops:</span> {r.stops}</p>}
                            </div>
                          </div>

                          {/* Billing */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Billing</h4>
                            <div className="text-sm text-gray-700 space-y-1">
                              <p><span className="text-gray-500">Ride Fare:</span> ${Number(r.rideFare || 0).toFixed(2)}</p>
                              {r.stopCharge > 0 && <p><span className="text-gray-500">Stops:</span> ${Number(r.stopCharge).toFixed(2)}</p>}
                              {r.childSeatCharge > 0 && <p><span className="text-gray-500">Child Seats:</span> ${Number(r.childSeatCharge).toFixed(2)}</p>}
                              <p><span className="text-gray-500">Subtotal:</span> ${Number(r.subtotal || 0).toFixed(2)}</p>
                              <p><span className="text-gray-500">HST (13%):</span> ${Number(r.hst || 0).toFixed(2)}</p>
                              <p><span className="text-gray-500">Gratuity:</span> ${Number(r.gratuity || 0).toFixed(2)}</p>
                              <p className="font-bold text-[#C9A063] text-base pt-1 border-t border-gray-200">
                                Total: ${Number(r.total || 0).toFixed(2)} CAD
                              </p>
                            </div>
                          </div>

                          {/* Flight Info */}
                          {(r.airline || r.flightNumber) && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Flight Info</h4>
                              <div className="text-sm text-gray-700 space-y-1">
                                {r.airline && <p><span className="text-gray-500">Airline:</span> {r.airline}</p>}
                                {r.flightNumber && <p><span className="text-gray-500">Flight #:</span> {r.flightNumber}</p>}
                                {r.flightNote && <p><span className="text-gray-500">Note:</span> {r.flightNote}</p>}
                              </div>
                            </div>
                          )}

                          {/* Special Requirements */}
                          {r.specialRequirements && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Special Requirements</h4>
                              <p className="text-sm text-gray-700">{r.specialRequirements}</p>
                            </div>
                          )}

                          {/* Submitted */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</h4>
                            <p className="text-sm text-gray-700">{r.dateSubmitted}</p>
                          </div>
                        </div>

                        {/* Action Links */}
                        <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-gray-200">
                          {r.driverLink && (
                            <a
                              href={r.driverLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 bg-[#C9A063] text-white rounded-lg text-sm font-medium hover:bg-[#B8904F] transition-colors"
                            >
                              <Car className="w-4 h-4" /> Driver Page
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {r.trackLink && (
                            <a
                              href={r.trackLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 bg-[#1C1C1E] text-white rounded-lg text-sm font-medium hover:bg-[#333] transition-colors"
                            >
                              <Eye className="w-4 h-4" /> Customer Track
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pb-6">
          <p className="text-gray-400 text-xs">
            Auto-refreshes every 30 seconds • {filtered.length} of {reservations.length} reservations shown
          </p>
        </div>
      </div>
    </div>
  );
}
