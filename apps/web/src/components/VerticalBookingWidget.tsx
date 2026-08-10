"use client";
import React, { useState } from 'react';
import { MapPin, Clock, HelpCircle, ChevronDown, LocateFixed, Loader2 } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import PlacesAutocomplete from '@/components/PlacesAutocomplete';
import { useGoogleMaps } from '@/components/GoogleMapsProvider';
import { useRouter } from 'next/navigation';

export default function VerticalBookingWidget() {
  const router = useRouter();
  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const [bookingMode, setBookingMode] = useState<"Distance" | "Hourly">("Distance");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupDateTime, setPickupDateTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState(3);
  const [durationDropdownOpen, setDurationDropdownOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleGetMyLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("Location not supported");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          if (!mapsLoaded || !window.google?.maps) {
            setPickup(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            setLocating(false);
            return;
          }
          const geocoder = new window.google.maps.Geocoder();
          const address = await new Promise<string>((resolve, reject) => {
            geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
              if (status === "OK" && results?.[0]?.formatted_address) {
                resolve(results[0].formatted_address);
              } else reject(new Error(String(status)));
            });
          });
          setPickup(address);
        } catch {
          setPickup(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          setLocationError("Address lookup failed");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocationError("Could not get location");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const handleCheckPricing = () => {
    const params = new URLSearchParams();
    params.set("mode", bookingMode.toLowerCase());
    if (pickup.trim()) params.set("pickup", pickup.trim());
    if (bookingMode === "Distance" && dropoff.trim()) params.set("dropoff", dropoff.trim());
    if (pickupDateTime) params.set("date", pickupDateTime.toISOString());
    if (bookingMode === "Hourly") params.set("duration", duration.toString());
    router.push(`/reservation${params.toString() ? "?" + params.toString() : ""}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-[360px] text-gray-800 font-sans border border-gray-100/50">
      <div className="p-5 flex flex-col gap-4 bg-[#fafafa]/50">
        {/* Service Toggle */}
        <div>
          <label className="block text-[13px] font-bold text-gray-900 mb-1.5 tracking-tight">Service</label>
          <div className="relative">
            <select 
              className="w-full border border-gray-200 rounded-lg text-[13px] py-2 px-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#C9A063] focus:border-transparent bg-white shadow-sm transition-all"
              value={bookingMode}
              onChange={(e) => {
                setBookingMode(e.target.value as "Distance" | "Hourly");
                setDropoff("");
              }}
            >
              <option>Distance</option>
              <option>Hourly</option>
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Pickup Location */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[13px] font-bold text-gray-900 tracking-tight">Pickup Location</label>
            <button
              type="button"
              onClick={handleGetMyLocation}
              disabled={locating}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C9A063] hover:text-[#B8935A] disabled:opacity-60 transition-colors"
            >
              {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <LocateFixed className="w-3 h-3" />}
              {locating ? "Locating..." : "Get my location"}
            </button>
          </div>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#C9A063] transition-all relative">
            <div className="bg-gray-50/80 px-2.5 flex items-center justify-center border-r border-gray-200 text-gray-400">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <PlacesAutocomplete
              value={pickup}
              onChange={(v) => { setPickup(v); setLocationError(null); }}
              placeholder="Enter pickup location"
              className="w-full text-[13px] py-2 px-3 focus:outline-none bg-transparent"
            />
          </div>
          {locationError && <p className="text-[10px] text-red-500 mt-1">{locationError}</p>}
        </div>

        {/* Field 2 */}
        {bookingMode === "Distance" ? (
          <div>
            <label className="block text-[13px] font-bold text-gray-900 mb-1.5 tracking-tight">Drop-off Location</label>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#C9A063] transition-all relative">
              <div className="bg-gray-50/80 px-2.5 flex items-center justify-center border-r border-gray-200 text-gray-400">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <PlacesAutocomplete
                value={dropoff}
                onChange={setDropoff}
                placeholder="Enter drop-off location"
                className="w-full text-[13px] py-2 px-3 focus:outline-none bg-transparent"
              />
            </div>
          </div>
        ) : (
          <div className="hero-datepicker">
            <label className="block text-[13px] font-bold text-gray-900 mb-1.5 tracking-tight">Pick-up Time</label>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#C9A063] transition-all">
              <div className="bg-gray-50/80 px-2.5 flex items-center justify-center border-r border-gray-200 text-gray-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <DatePicker
                selected={pickupDateTime}
                onChange={(date: Date | null) => setPickupDateTime(date)}
                showTimeSelect
                timeIntervals={15}
                timeCaption="Time"
                dateFormat="MMM d, h:mm aa"
                timeFormat="h:mm aa"
                minDate={new Date()}
                placeholderText="Select date & time"
                className="w-full text-[13px] py-2 px-3 focus:outline-none cursor-pointer bg-transparent"
              />
            </div>
          </div>
        )}

        {/* Field 3 */}
        {bookingMode === "Distance" ? (
          <div className="hero-datepicker">
            <label className="block text-[13px] font-bold text-gray-900 mb-1.5 tracking-tight">Pick-up Time</label>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#C9A063] transition-all">
              <div className="bg-gray-50/80 px-2.5 flex items-center justify-center border-r border-gray-200 text-gray-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <DatePicker
                selected={pickupDateTime}
                onChange={(date: Date | null) => setPickupDateTime(date)}
                showTimeSelect
                timeIntervals={15}
                timeCaption="Time"
                dateFormat="MMM d, h:mm aa"
                timeFormat="h:mm aa"
                minDate={new Date()}
                placeholderText="Select date & time"
                portalId="root"
                className="w-full text-[13px] py-2 px-3 focus:outline-none cursor-pointer bg-transparent"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="flex items-center gap-1 text-[13px] font-bold text-gray-900 mb-1.5 tracking-tight">
              Duration (hours)
              <HelpCircle className="w-3.5 h-3.5 text-[#C9A063]" title="Minimum 3 hours" />
            </label>
            <div className="relative border border-gray-200 rounded-lg overflow-hidden flex items-center bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#C9A063] transition-all">
              <div className="bg-gray-50/80 px-2.5 flex items-center justify-center border-r border-gray-200 text-gray-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <select 
                value={duration} 
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full text-[13px] py-2 px-3 appearance-none focus:outline-none bg-transparent font-medium"
              >
                {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                  <option key={h} value={h}>{h} hours</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-gray-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        )}

        {/* Check Pricing Button */}
        <button 
          onClick={handleCheckPricing}
          className="w-full bg-black text-white py-3 rounded-lg text-[14px] font-bold hover:bg-gray-900 transition-colors mt-2 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 duration-200"
        >
          Reserve Now
        </button>
      </div>

      <style jsx global>{`
        .hero-datepicker .react-datepicker-wrapper {
          width: 100%;
        }
        .hero-datepicker .react-datepicker__input-container input {
          width: 100%;
        }
        .hero-datepicker .react-datepicker-popper {
          z-index: 50;
        }
      `}</style>
    </div>
  );
}
