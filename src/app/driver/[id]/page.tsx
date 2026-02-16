"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Car, MapPin, Clock, User, CheckCircle2, Loader2 } from "lucide-react";

const STATUS_STEPS = [
  { key: "ON THE WAY", label: "On The Way", icon: Car, color: "bg-blue-500" },
  { key: "ARRIVED", label: "Arrived", icon: MapPin, color: "bg-yellow-500" },
  { key: "CIC", label: "Customer in Car", icon: User, color: "bg-purple-500" },
  { key: "DONE", label: "Done", icon: CheckCircle2, color: "bg-green-500" },
];

export default function DriverPage() {
  const params = useParams();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<any>(null);
  const [currentStatus, setCurrentStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/driver-status?bookingId=${encodeURIComponent(bookingId)}`);
      const data = await res.json();
      if (data.success) {
        setBooking(data);
        setCurrentStatus(data.status || "PENDING");
      } else {
        setError(data.error || "Booking not found");
      }
    } catch {
      setError("Failed to load booking");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(newStatus);
    setError("");
    try {
      const res = await fetch("/api/driver-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentStatus(newStatus);
      } else {
        setError(data.error || "Failed to update");
      }
    } catch {
      setError("Failed to update status");
    } finally {
      setUpdating("");
    }
  };

  const getStatusIndex = () => STATUS_STEPS.findIndex((s) => s.key === currentStatus);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#C9A063] mx-auto mb-3" />
          <p className="text-gray-500">Loading booking...</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Booking Not Found</h1>
          <p className="text-gray-500 text-sm">{error}</p>
          <p className="text-gray-400 text-xs mt-3">ID: {bookingId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1C1C1E] to-[#2C2C2E] text-white px-6 py-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Car className="w-5 h-5 text-[#C9A063]" />
            <span className="text-[#C9A063] text-sm font-medium">SARJ Driver Portal</span>
          </div>
          <h1 className="text-2xl font-bold">{bookingId}</h1>
          {booking && (
            <div className="mt-4 space-y-2 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span>{booking.firstName} {booking.lastName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-gray-400" />
                <span>{booking.vehicle}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{booking.serviceDate} at {booking.serviceTime}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-400 mt-0.5" />
                <span>{booking.pickupLocation}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-400 mt-0.5" />
                <span>{booking.dropoffLocation}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Status */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Current Status</p>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold ${
            currentStatus === "DONE" ? "bg-green-500" :
            currentStatus === "CIC" ? "bg-purple-500" :
            currentStatus === "ARRIVED" ? "bg-yellow-500" :
            currentStatus === "ON THE WAY" ? "bg-blue-500" :
            "bg-gray-400"
          }`}>
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {currentStatus}
          </div>
        </div>

        {/* Status Buttons */}
        <div className="space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Update Status</p>
          {STATUS_STEPS.map((step, index) => {
            const StatusIcon = step.icon;
            const isActive = step.key === currentStatus;
            const isPast = index < getStatusIndex();
            const isDisabled = updating !== "" || (currentStatus === "DONE" && step.key !== "DONE");

            return (
              <button
                key={step.key}
                onClick={() => updateStatus(step.key)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 ${
                  isActive
                    ? "border-[#C9A063] bg-[#C9A063]/5 shadow-md"
                    : isPast
                    ? "border-green-200 bg-green-50 opacity-60"
                    : "border-gray-200 bg-white hover:border-[#C9A063]/50 hover:shadow-sm"
                } ${isDisabled && !isActive ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isActive ? step.color : isPast ? "bg-green-100" : "bg-gray-100"
                }`}>
                  {updating === step.key ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <StatusIcon className={`w-5 h-5 ${isActive || isPast ? "text-white" : "text-gray-400"}`} />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-semibold ${isActive ? "text-[#C9A063]" : isPast ? "text-green-600" : "text-gray-700"}`}>
                    {step.label}
                  </p>
                  {isActive && <p className="text-xs text-gray-500 mt-0.5">Current status</p>}
                  {isPast && <p className="text-xs text-green-500 mt-0.5">Completed</p>}
                </div>
                {isActive && (
                  <div className="w-3 h-3 bg-[#C9A063] rounded-full animate-pulse" />
                )}
                {isPast && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <p className="text-center text-gray-400 text-xs mt-8 mb-6">
          SARJ Worldwide Chauffeur Services
        </p>
      </div>
    </div>
  );
}
