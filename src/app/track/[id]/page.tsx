"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Car, MapPin, Clock, User, CheckCircle2, Loader2, Phone } from "lucide-react";
import Image from "next/image";

const STATUS_STEPS = [
  { key: "PENDING", label: "Reservation Confirmed", description: "Your booking has been received", icon: CheckCircle2, color: "text-gray-400", bgColor: "bg-gray-100" },
  { key: "ON THE WAY", label: "Driver On The Way", description: "Your driver is heading to the pick-up location", icon: Car, color: "text-blue-500", bgColor: "bg-blue-50" },
  { key: "ARRIVED", label: "Driver Arrived", description: "Your driver has arrived at the pick-up location", icon: MapPin, color: "text-yellow-500", bgColor: "bg-yellow-50" },
  { key: "CIC", label: "Customer In Car", description: "You are on your way to the destination", icon: User, color: "text-purple-500", bgColor: "bg-purple-50" },
  { key: "DONE", label: "Ride Complete", description: "Thank you for choosing SARJ Worldwide", icon: CheckCircle2, color: "text-green-500", bgColor: "bg-green-50" },
];

export default function TrackPage() {
  const params = useParams();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<any>(null);
  const [currentStatus, setCurrentStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/driver-status?bookingId=${encodeURIComponent(bookingId)}`);
      const data = await res.json();
      if (data.success) {
        setBooking(data);
        setCurrentStatus(data.status || "PENDING");
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

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 5 seconds for real-time updates
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const getStatusIndex = () => STATUS_STEPS.findIndex((s) => s.key === currentStatus);
  const statusIndex = getStatusIndex();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1C1C1E] to-[#2C2C2E] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#C9A063] mx-auto mb-3" />
          <p className="text-gray-400">Loading your ride status...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1C1C1E] to-[#2C2C2E] flex items-center justify-center p-6">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#C9A063]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-[#C9A063]" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Link Expired</h1>
          <p className="text-gray-400 text-sm">This tracking link has expired.</p>
          <p className="text-gray-500 text-xs mt-3">Thank you for choosing SARJ Worldwide Chauffeur Services.</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1C1C1E] to-[#2C2C2E] flex items-center justify-center p-6">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Booking Not Found</h1>
          <p className="text-gray-400 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-3">ID: {bookingId}</p>
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
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[#C9A063] to-[#A68B5B] rounded-xl flex items-center justify-center shadow-lg">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-white font-bold text-lg">SARJ Worldwide</h2>
              <p className="text-[#C9A063] text-xs">Live Tracking</p>
            </div>
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#C9A063]/30 bg-[#C9A063]/10 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A063] animate-pulse" />
            <span className="text-[#C9A063] text-xs font-medium tracking-widest uppercase">Live Status</span>
          </div>
          <h1 className="text-white text-2xl font-bold mb-1">Track Your Ride</h1>
          <p className="text-gray-400 text-sm">{bookingId}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 sm:px-6">
        {/* Current Status Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 mb-4 sm:mb-6">
          {(() => {
            const current = STATUS_STEPS[statusIndex] || STATUS_STEPS[0];
            const CurrentIcon = current.icon;
            return (
              <div className="text-center">
                <div className={`w-16 h-16 ${current.bgColor} rounded-full flex items-center justify-center mx-auto mb-3`}>
                  <CurrentIcon className={`w-8 h-8 ${current.color}`} />
                </div>
                <h2 className="text-white text-xl font-bold mb-1">{current.label}</h2>
                <p className="text-gray-400 text-sm">{current.description}</p>
              </div>
            );
          })()}
        </div>

        {/* Chauffeur & Ride Details - Combined Card */}
        {booking && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 mb-4 sm:mb-6">
            {/* Chauffeur Section */}
            {booking.chauffeurName && (
              <div className="mb-4 sm:mb-5 pb-4 sm:pb-5 border-b border-white/10">
                <h3 className="text-white text-xs font-semibold mb-3 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-[#C9A063]" />
                  Your Chauffeur
                </h3>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#C9A063] to-[#A68B5B] flex items-center justify-center overflow-hidden ring-2 ring-[#C9A063]/30 flex-shrink-0">
                    {booking.chauffeurPhoto ? (
                      <Image src={booking.chauffeurPhoto} alt={booking.chauffeurName} width={56} height={56} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-7 h-7 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold">{booking.chauffeurName}</p>
                    <a href={`tel:${booking.chauffeurPhone}`} className="text-[#C9A063] text-sm hover:underline flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {booking.chauffeurPhone}
                    </a>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-gray-300 text-xs sm:text-sm">
                      <span className="flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C9A063]" />
                        {booking.chauffeurVehicle}
                      </span>
                      <span className="font-mono font-medium">{booking.chauffeurPlate}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ride Details Section */}
            <div>
              <h3 className="text-white text-xs font-semibold mb-3 uppercase tracking-wider flex items-center gap-2">
                <Car className="w-3.5 h-3.5 text-[#C9A063]" />
                Ride Details
              </h3>
              {booking.serviceDate && (
                <div className="bg-white/5 rounded-lg p-2.5 mb-3">
                  <p className="text-gray-500 text-[10px] uppercase">Date & Time</p>
                  <p className="text-gray-300 text-sm font-medium">{booking.serviceDate}</p>
                  <p className="text-[#C9A063] text-xs">{booking.serviceTime}</p>
                </div>
              )}
              <div className="space-y-2">
                {booking.pickupLocation && (
                  <div className="flex items-start gap-2.5 bg-white/5 rounded-lg p-2.5">
                    <MapPin className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-green-400 text-[10px] uppercase font-medium">Pick-up</p>
                      <p className="text-gray-300 text-sm">{booking.pickupLocation}</p>
                    </div>
                  </div>
                )}
                {booking.dropoffLocation && (
                  <div className="flex items-start gap-2.5 bg-white/5 rounded-lg p-2.5">
                    <MapPin className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-red-400 text-[10px] uppercase font-medium">Drop-off</p>
                      <p className="text-gray-300 text-sm">{booking.dropoffLocation}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status Timeline */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="space-y-0">
            {STATUS_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index <= statusIndex;
              const isCurrent = index === statusIndex;

              return (
                <div key={step.key} className="flex items-start gap-3 sm:gap-4">
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                      isCurrent
                        ? "bg-[#C9A063] shadow-lg shadow-[#C9A063]/30"
                        : isCompleted
                        ? "bg-green-500/20 border border-green-500/40"
                        : "bg-white/5 border border-white/10"
                    }`}>
                      <StepIcon className={`w-4 h-4 ${
                        isCurrent ? "text-white" : isCompleted ? "text-green-400" : "text-gray-500"
                      }`} />
                    </div>
                    {index < STATUS_STEPS.length - 1 && (
                      <div className={`w-0.5 h-8 sm:h-10 my-1 transition-all duration-500 ${
                        isCompleted && index < statusIndex ? "bg-green-500/40" : "bg-white/10"
                      }`} />
                    )}
                  </div>
                  {/* Label */}
                  <div className="pt-2 pb-4">
                    <p className={`text-sm font-semibold ${
                      isCurrent ? "text-[#C9A063]" : isCompleted ? "text-green-400" : "text-gray-500"
                    }`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact */}
        <div className="text-center pb-8 sm:pb-10">
          <p className="text-gray-500 text-xs mb-3">Need assistance?</p>
          <a
            href="tel:+14168935779"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C9A063]/10 border border-[#C9A063]/30 rounded-full text-[#C9A063] text-sm font-medium hover:bg-[#C9A063]/20 transition-all"
          >
            <Phone className="w-4 h-4" />
            416-893-5779
          </a>
          <p className="text-gray-600 text-xs mt-6">
            SARJ Worldwide Chauffeur Services
          </p>
          <p className="text-gray-600 text-[10px] mt-1">
            Live updates every 5 seconds
          </p>
        </div>
      </div>
    </div>
  );
}
