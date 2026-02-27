"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Car, MapPin, Clock, User, CheckCircle2, Loader2, Phone, Lock } from "lucide-react";

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
  const [expired, setExpired] = useState(false);
  const [canEditStatus, setCanEditStatus] = useState(true);
  const [editTimeRemaining, setEditTimeRemaining] = useState(0);
  const [lockedStatuses, setLockedStatuses] = useState<string[]>([]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/driver-status?bookingId=${encodeURIComponent(bookingId)}`);
      const data = await res.json();
      if (data.success) {
        setBooking(data);
        setCurrentStatus(data.status || "PENDING");
        setCanEditStatus(data.canEditStatus ?? true);
        setEditTimeRemaining(data.editTimeRemaining ?? 0);
      } else if (data.expired) {
        setExpired(true);
      } else {
        setError(data.error || "Booking not found");
      }
    } catch {
      setError("Failed to load booking");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  // Countdown timer for edit window
  useEffect(() => {
    if (editTimeRemaining > 0 && canEditStatus) {
      const timer = setInterval(() => {
        setEditTimeRemaining((prev) => {
          if (prev <= 1) {
            setCanEditStatus(false);
            // Lock current status and all past statuses permanently
            const currentIdx = STATUS_STEPS.findIndex((s) => s.key === currentStatus);
            const statusesToLock = STATUS_STEPS.slice(0, currentIdx + 1).map((s) => s.key);
            setLockedStatuses((prevLocked) => {
              const newLocked = new Set([...prevLocked, ...statusesToLock]);
              return Array.from(newLocked);
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [editTimeRemaining, canEditStatus, currentStatus]);

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
        // Before changing status, lock all statuses that are 2+ steps back from current
        // These should stay locked permanently
        const currentIdx = STATUS_STEPS.findIndex((s) => s.key === currentStatus);
        const newIdx = STATUS_STEPS.findIndex((s) => s.key === newStatus);
        
        // Lock statuses that are more than 1 step back from CURRENT position (before move)
        if (currentIdx > 1) {
          const statusesToLock = STATUS_STEPS.slice(0, currentIdx - 1).map((s) => s.key);
          setLockedStatuses((prevLocked) => {
            const newLocked = new Set([...prevLocked, ...statusesToLock]);
            return Array.from(newLocked);
          });
        }
        
        setCurrentStatus(newStatus);
        // Reset edit window to 5 minutes after successful update
        setCanEditStatus(true);
        setEditTimeRemaining(300); // 5 minutes in seconds
      } else {
        setError(data.error || "Failed to update");
      }
    } catch {
      setError("Failed to update status");
    } finally {
      setUpdating("");
    }
  };

  // Format time remaining as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIndex = () => STATUS_STEPS.findIndex((s) => s.key === currentStatus);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1C1C1E] to-[#2C2C2E] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#C9A063] mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading booking...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1C1C1E] to-[#2C2C2E] flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 sm:p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#C9A063]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-[#C9A063]" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-white mb-2">Link Expired</h1>
          <p className="text-gray-400 text-sm">This driver link has expired.</p>
          <p className="text-gray-500 text-xs mt-3">Thank you for representing SARJ Worldwide.</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1C1C1E] to-[#2C2C2E] flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 sm:p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-xl sm:text-2xl">⚠️</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-white mb-2">Booking Not Found</h1>
          <p className="text-gray-400 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-3 break-all">ID: {bookingId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1C1C1E] to-[#2C2C2E]">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6">
        <div className="max-w-lg mx-auto text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#C9A063] to-[#A68B5B] rounded-xl flex items-center justify-center shadow-lg">
              <Car className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-white font-bold text-base sm:text-lg">SARJ Worldwide</h2>
              <p className="text-[#C9A063] text-[10px] sm:text-xs">Your Chauffeur Panel</p>
            </div>
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#C9A063]/30 bg-[#C9A063]/10 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A063] animate-pulse" />
            <span className="text-[#C9A063] text-xs font-medium tracking-widest uppercase">Your Chauffeur Status</span>
          </div>
          {/* <h1 className="text-white text-xl sm:text-2xl font-bold mb-1">Update Status</h1> */}
          <p className="text-gray-400 text-xs sm:text-sm break-all">{bookingId}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 sm:px-6">
        {/* Customer & Ride Details Card */}
        {booking && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 mb-4 sm:mb-6">
            {/* Customer Section */}
            <div className="mb-4 pb-4 border-b border-white/10">
              <h3 className="text-white text-xs font-semibold mb-3 uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-[#C9A063]" />
                Customer Details
              </h3>
              <div className="space-y-2">
                <p className="text-white font-semibold text-base sm:text-lg">{booking.firstName} {booking.lastName}</p>
                {booking.phone && (
                  <a href={`tel:${booking.phone}`} className="inline-flex items-center gap-2 text-[#C9A063] hover:underline text-sm">
                    <Phone className="w-4 h-4" />
                    {booking.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Ride Details Section */}
            <div>
              <h3 className="text-white text-xs font-semibold mb-3 uppercase tracking-wider flex items-center gap-2">
                <Car className="w-3.5 h-3.5 text-[#C9A063]" />
                Ride Details
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
                <div className="bg-white/5 rounded-lg p-2.5">
                  <p className="text-gray-500 text-[10px] uppercase">Vehicle</p>
                  <p className="text-gray-300 text-sm font-medium">{booking.vehicle}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2.5">
                  <p className="text-gray-500 text-[10px] uppercase">Date & Time</p>
                  <p className="text-gray-300 text-sm font-medium">{booking.serviceDate}</p>
                  <p className="text-[#C9A063] text-xs">{booking.serviceTime}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 bg-white/5 rounded-lg p-2.5">
                  <MapPin className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-green-400 text-[10px] uppercase font-medium">Pick-up</p>
                    <p className="text-gray-300 text-sm">{booking.pickupLocation}</p>
                  </div>
                </div>
                {booking.stops && (
                  <div className="flex items-start gap-2.5 bg-white/5 rounded-lg p-2.5">
                    <MapPin className="w-4 h-4 text-[#C9A063] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[#C9A063] text-[10px] uppercase font-medium">Stop</p>
                      <p className="text-gray-300 text-sm">{booking.stops}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2.5 bg-white/5 rounded-lg p-2.5">
                  <MapPin className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-400 text-[10px] uppercase font-medium">Drop-off</p>
                    <p className="text-gray-300 text-sm">{booking.dropoffLocation}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Status Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 mb-4 sm:mb-6">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Current Status</p>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold ${
            currentStatus === "DONE" ? "bg-green-500" :
            currentStatus === "CIC" ? "bg-purple-500" :
            currentStatus === "ARRIVED" ? "bg-yellow-500" :
            currentStatus === "ON THE WAY" ? "bg-blue-500" :
            "bg-gray-500"
          }`}>
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {currentStatus}
          </div>
        </div>

        {/* Status Buttons */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider font-medium">Your Chauffeur Status</p>
            {canEditStatus && editTimeRemaining > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-[#C9A063]/10 border border-[#C9A063]/30 rounded-full">
                <Clock className="w-3 h-3 text-[#C9A063]" />
                <span className="text-[#C9A063] text-xs font-medium">{formatTime(editTimeRemaining)}</span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {STATUS_STEPS.map((step, index) => {
              const StatusIcon = step.icon;
              const isActive = step.key === currentStatus;
              const isPast = index < getStatusIndex();
              const isFuture = index > getStatusIndex();
              const currentIdx = getStatusIndex();
              // Check if this status is permanently locked
              const isPermanentlyLocked = lockedStatuses.includes(step.key);
              // Within 5 mins: allow only 1 step back (if not permanently locked)
              const isOneStepBack = index === currentIdx - 1;
              const canGoBack = canEditStatus && isOneStepBack && !isPermanentlyLocked;
              // Status is locked if permanently locked OR (past and can't go back)
              const isLocked = isPermanentlyLocked || (isPast && !canGoBack);
              const isDisabled = updating !== "" || isLocked;

              return (
                <button
                  key={step.key}
                  onClick={() => updateStatus(step.key)}
                  disabled={isDisabled}
                  className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all duration-300 ${
                    isActive
                      ? "border-[#C9A063] bg-[#C9A063]/10"
                      : isPast
                      ? "border-green-500/30 bg-green-500/10"
                      : "border-white/10 bg-white/5 hover:border-[#C9A063]/50 hover:bg-white/10"
                  } ${isDisabled && !isActive ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isActive ? step.color : isPast ? "bg-green-500/20" : "bg-white/10"
                  }`}>
                    {updating === step.key ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <StatusIcon className={`w-5 h-5 ${isActive ? "text-white" : isPast ? "text-green-400" : "text-gray-400"}`} />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold text-sm sm:text-base ${isActive ? "text-[#C9A063]" : isPast ? "text-green-400" : "text-white"}`}>
                      {step.label}
                    </p>
                    {isActive && <p className="text-xs text-gray-400 mt-0.5">Current status</p>}
                    {isPast && <p className="text-xs text-green-400/70 mt-0.5">Completed</p>}
                  </div>
                  {isLocked && (
                    <Lock className="w-4 h-4 text-red-400" />
                  )}
                  {!isLocked && isActive && (
                    <div className="w-3 h-3 bg-[#C9A063] rounded-full animate-pulse" />
                  )}
                  {!isLocked && isPast && (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <p className="text-center text-gray-500 text-xs mt-6 mb-8">
          SARJ Worldwide Chauffeur Services
        </p>
      </div>
    </div>
  );
}
