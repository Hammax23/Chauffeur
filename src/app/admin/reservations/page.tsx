"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, Filter, ExternalLink, Phone, Mail,
  Car, MapPin, Clock, Users, ChevronDown, ChevronUp,
  Loader2, AlertCircle, Eye, Copy, Check, Pencil, Trash2, X, Save,
  CreditCard, DollarSign
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
  stripeCustomerId?: string;
  stripePaymentMethodId?: string;
  cardType?: string;
  cardLast4?: string;
  paymentStatus?: string;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [chargingId, setChargingId] = useState<string | null>(null);
  const [chargeResult, setChargeResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null);
  const [chargeAmounts, setChargeAmounts] = useState<Record<string, number>>({});

  const copyToClipboard = async (url: string, type: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(type);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };
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

  const chargeCustomer = async (reservation: Reservation) => {
    if (!reservation.stripeCustomerId || !reservation.stripePaymentMethodId) {
      setChargeResult({ id: reservation.bookingId, success: false, message: "No payment method on file" });
      return;
    }
    
    setChargingId(reservation.bookingId);
    setChargeResult(null);
    
    try {
      const res = await fetch("/api/stripe/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: reservation.stripeCustomerId,
          paymentMethodId: reservation.stripePaymentMethodId,
          amount: reservation.total,
          currency: "cad",
          description: `Chauffeur Service - ${reservation.serviceType} - ${reservation.serviceDate}`,
          reservationId: reservation.bookingId,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setChargeResult({ id: reservation.bookingId, success: true, message: `Payment successful! $${data.amount} charged` });
        fetchReservations();
      } else {
        setChargeResult({ id: reservation.bookingId, success: false, message: data.message || data.error || "Payment failed" });
      }
    } catch (err) {
      console.error("Charge error:", err);
      setChargeResult({ id: reservation.bookingId, success: false, message: "Failed to process payment" });
    } finally {
      setChargingId(null);
    }
  };

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

  const handleDelete = async (bookingId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/reservations/${bookingId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setReservations(prev => prev.filter(r => r.bookingId !== bookingId));
        setDeleteConfirm(null);
        setExpandedRow(null);
      } else {
        alert("Failed to delete reservation");
      }
    } catch (err) {
      alert("Error deleting reservation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (bookingId: string, updates: Partial<Reservation>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/reservations/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setReservations(prev => prev.map(r => r.bookingId === bookingId ? { ...r, ...updates } : r));
        setEditingReservation(null);
      } else {
        alert("Failed to update reservation");
      }
    } catch (err) {
      alert("Error updating reservation");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#C9A063] mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Reservations</h1>
          <p className="text-gray-500 mt-1">Manage all bookings and trips</p>
        </div>
        <button
          onClick={() => fetchReservations(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1C1C1E] text-white rounded-xl text-sm font-medium hover:bg-[#2C2C2E] transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

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

                        {/* Payment Info */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</h4>
                          <div className="text-sm text-gray-700 space-y-1">
                            {r.cardType && r.cardLast4 ? (
                              <>
                                <p className="flex items-center gap-2">
                                  <CreditCard className="w-4 h-4 text-gray-400" />
                                  <span>{r.cardType} ****{r.cardLast4}</span>
                                </p>
                                <p className="text-xs text-green-600">✓ Card on file</p>
                              </>
                            ) : (
                              <p className="text-gray-400 italic">No card on file</p>
                            )}
                            {r.paymentStatus && (
                              <p className={`text-xs font-medium ${r.paymentStatus === 'PAID' ? 'text-green-600' : 'text-amber-600'}`}>
                                Status: {r.paymentStatus}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Links */}
                      <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-gray-200">
                        {r.driverLink && (
                          <div className="flex items-center gap-1">
                            <a
                              href={r.driverLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 bg-[#C9A063] text-white rounded-l-lg text-sm font-medium hover:bg-[#B8904F] transition-colors"
                            >
                              <Car className="w-4 h-4" /> Driver Page
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(r.driverLink, `driver-${r.bookingId}`); }}
                              className={`flex items-center gap-1 px-3 py-2 rounded-r-lg text-sm font-medium transition-all ${
                                copiedUrl === `driver-${r.bookingId}` 
                                  ? "bg-green-500 text-white" 
                                  : "bg-[#B8904F] text-white hover:bg-[#A07F3F]"
                              }`}
                              title="Copy Driver URL"
                            >
                              {copiedUrl === `driver-${r.bookingId}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        )}
                        {r.trackLink && (
                          <div className="flex items-center gap-1">
                            <a
                              href={r.trackLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 bg-[#1C1C1E] text-white rounded-l-lg text-sm font-medium hover:bg-[#333] transition-colors"
                            >
                              <Eye className="w-4 h-4" /> Customer Track
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(r.trackLink, `track-${r.bookingId}`); }}
                              className={`flex items-center gap-1 px-3 py-2 rounded-r-lg text-sm font-medium transition-all ${
                                copiedUrl === `track-${r.bookingId}` 
                                  ? "bg-green-500 text-white" 
                                  : "bg-[#333] text-white hover:bg-[#444]"
                              }`}
                              title="Copy Track URL"
                            >
                              {copiedUrl === `track-${r.bookingId}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        )}

                        {/* Charge Button with Editable Amount */}
                        {r.stripeCustomerId && r.stripePaymentMethodId && r.paymentStatus !== 'PAID' && (
                          <div className="flex items-center gap-2">
                            {editingChargeId === r.bookingId ? (
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={chargeAmounts[r.bookingId] ?? r.total ?? 0}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      setChargeAmounts(prev => ({ ...prev, [r.bookingId]: parseFloat(e.target.value) || 0 }));
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-28 pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                  />
                                </div>
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const amount = chargeAmounts[r.bookingId] ?? r.total ?? 0;
                                    chargeCustomer({ ...r, total: amount }); 
                                    setEditingChargeId(null);
                                  }}
                                  disabled={chargingId === r.bookingId}
                                  className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                  {chargingId === r.bookingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingChargeId(null); }}
                                  className="flex items-center gap-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setEditingChargeId(r.bookingId);
                                  setChargeAmounts(prev => ({ ...prev, [r.bookingId]: r.total ?? 0 }));
                                }}
                                disabled={chargingId === r.bookingId}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {chargingId === r.bookingId ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Charging...
                                  </>
                                ) : (
                                  <>
                                    <DollarSign className="w-4 h-4" /> Charge ${Number(chargeAmounts[r.bookingId] ?? r.total ?? 0).toFixed(2)}
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Charge Result Message */}
                        {chargeResult && chargeResult.id === r.bookingId && (
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                            chargeResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {chargeResult.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {chargeResult.message}
                          </div>
                        )}

                        {/* Edit & Delete Buttons */}
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingReservation(r); }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(r.bookingId); }}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
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
      <div className="text-center mt-6">
        <p className="text-gray-400 text-xs">
          Auto-refreshes every 30 seconds • {filtered.length} of {reservations.length} reservations shown
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Reservation?</h3>
              <p className="text-gray-500 text-sm mb-1">Are you sure you want to delete this reservation?</p>
              <p className="text-[#C9A063] font-semibold text-sm mb-6">{deleteConfirm}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Reservation Modal */}
      {editingReservation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Edit Reservation</h3>
                <p className="text-[#C9A063] text-sm font-medium">{editingReservation.bookingId}</p>
              </div>
              <button
                onClick={() => setEditingReservation(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  value={editingReservation.status}
                  onChange={(e) => setEditingReservation({ ...editingReservation, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A063] focus:border-transparent"
                >
                  {STATUS_OPTIONS.filter(s => s !== "ALL").map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    value={editingReservation.firstName}
                    onChange={(e) => setEditingReservation({ ...editingReservation, firstName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A063] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={editingReservation.lastName}
                    onChange={(e) => setEditingReservation({ ...editingReservation, lastName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A063] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={editingReservation.email}
                    onChange={(e) => setEditingReservation({ ...editingReservation, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A063] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={editingReservation.phone}
                    onChange={(e) => setEditingReservation({ ...editingReservation, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A063] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Trip Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Service Date</label>
                  <input
                    type="text"
                    value={editingReservation.serviceDate}
                    onChange={(e) => setEditingReservation({ ...editingReservation, serviceDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A063] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Service Time</label>
                  <input
                    type="text"
                    value={editingReservation.serviceTime}
                    onChange={(e) => setEditingReservation({ ...editingReservation, serviceTime: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A063] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pickup Location</label>
                <input
                  type="text"
                  value={editingReservation.pickupLocation}
                  onChange={(e) => setEditingReservation({ ...editingReservation, pickupLocation: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A063] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Dropoff Location</label>
                <input
                  type="text"
                  value={editingReservation.dropoffLocation}
                  onChange={(e) => setEditingReservation({ ...editingReservation, dropoffLocation: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A063] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Special Requirements</label>
                <textarea
                  value={editingReservation.specialRequirements || ""}
                  onChange={(e) => setEditingReservation({ ...editingReservation, specialRequirements: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A063] focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setEditingReservation(null)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdate(editingReservation.bookingId, {
                  status: editingReservation.status,
                  firstName: editingReservation.firstName,
                  lastName: editingReservation.lastName,
                  email: editingReservation.email,
                  phone: editingReservation.phone,
                  serviceDate: editingReservation.serviceDate,
                  serviceTime: editingReservation.serviceTime,
                  pickupLocation: editingReservation.pickupLocation,
                  dropoffLocation: editingReservation.dropoffLocation,
                  specialRequirements: editingReservation.specialRequirements,
                })}
                className="flex-1 px-4 py-3 bg-[#C9A063] text-white rounded-xl font-medium hover:bg-[#B8904F] transition-colors flex items-center justify-center gap-2"
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
