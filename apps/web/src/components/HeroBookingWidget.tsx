"use client";
import { MapPin, Clock, ChevronDown, HelpCircle, LocateFixed, Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PlacesAutocomplete from '@/components/PlacesAutocomplete';
import { useGoogleMaps } from '@/components/GoogleMapsProvider';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function HeroBookingWidget() {
  const router = useRouter();
  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const [bookingMode, setBookingMode] = useState<"distance" | "hourly">("distance");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupDateTime, setPickupDateTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState(3);
  const [durationDropdownOpen, setDurationDropdownOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleGetMyLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("Location is not supported on this device.");
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
            geocoder.geocode(
              { location: { lat: latitude, lng: longitude } },
              (results, status) => {
                if (status === "OK" && results?.[0]?.formatted_address) {
                  resolve(results[0].formatted_address);
                } else {
                  reject(new Error(String(status)));
                }
              }
            );
          });
          setPickup(address);
        } catch {
          setPickup(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          setLocationError("Address lookup failed — coordinates filled instead.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("Location permission denied. Enable it in browser settings.");
        } else if (err.code === err.TIMEOUT) {
          setLocationError("Location request timed out. Try again.");
        } else {
          setLocationError("Could not get your location. Try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  }, [mapsLoaded]);

  const handleNext = () => {
    const params = new URLSearchParams();
    params.set("mode", bookingMode);
    if (pickup.trim()) params.set("pickup", pickup.trim());
    if (bookingMode === "distance" && dropoff.trim()) {
      params.set("dropoff", dropoff.trim());
    }
    if (pickupDateTime) {
      params.set("date", pickupDateTime.toISOString());
    }
    if (bookingMode === "hourly") {
      params.set("duration", duration.toString());
    }
    router.push(`/reservation${params.toString() ? "?" + params.toString() : ""}`);
  };

  return (
    <>
      <div id="book" className="w-full max-w-[900px] mt-1 sm:mt-2 md:mt-3 lg:mt-4 mb-8 sm:mb-10 mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-center mb-4">
          <div className="inline-flex rounded-full p-1 bg-gradient-to-r from-[#1a1a2e]/90 to-[#16213e]/90 backdrop-blur-md border border-[#C9A063]/30 shadow-xl">
            <button
              type="button"
              onClick={() => setBookingMode("distance")}
              className={`relative px-6 sm:px-8 py-2.5 rounded-full text-[12px] sm:text-[13px] font-semibold tracking-wide transition-all duration-300 ${bookingMode === "distance"
                ? "bg-gradient-to-r from-[#C9A063] to-[#D4AF6F] text-white shadow-lg"
                : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
            >
              DISTANCE
            </button>
            <button
              type="button"
              onClick={() => {
                setBookingMode("hourly");
                setDropoff("");
              }}
              className={`relative px-6 sm:px-8 py-2.5 rounded-full text-[12px] sm:text-[13px] font-semibold tracking-wide transition-all duration-300 ${bookingMode === "hourly"
                ? "bg-gradient-to-r from-[#C9A063] to-[#D4AF6F] text-white shadow-lg"
                : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
            >
              HOURLY
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl md:rounded-full shadow-2xl px-4 py-4 sm:px-5 sm:py-4 md:px-6 md:py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-0">
            {/* Pickup Location */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0 md:px-2">
              <div className="w-8 h-8 rounded-full bg-[#C9A063]/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-[#C9A063]" strokeWidth={2} />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <label className="text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wide">
                    Pickup
                  </label>
                  <button
                    type="button"
                    onClick={handleGetMyLocation}
                    disabled={locating}
                    className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-[#C9A063] hover:text-[#B8935A] disabled:opacity-60 transition-colors whitespace-nowrap"
                    title="Use your current location"
                  >
                    {locating ? (
                      <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2.5} />
                    ) : (
                      <LocateFixed className="w-3 h-3" strokeWidth={2.5} />
                    )}
                    {locating ? "Locating…" : "Get my location"}
                  </button>
                </div>
                <PlacesAutocomplete
                  value={pickup}
                  onChange={(v) => {
                    setPickup(v);
                    if (locationError) setLocationError(null);
                  }}
                  placeholder="Enter pickup location"
                  className="text-[14px] sm:text-[15px] text-gray-900 placeholder:text-gray-400 outline-none bg-transparent w-full py-0.5 border-0 focus:ring-0"
                />
                {locationError && (
                  <p className="text-[10px] text-red-500 mt-0.5 leading-tight">{locationError}</p>
                )}
              </div>
            </div>

            {bookingMode === "distance" && (
              <>
                <div className="hidden md:block w-px self-stretch bg-gray-200 flex-shrink-0 mx-2"></div>
                <div className="md:hidden h-px w-full bg-gray-200 flex-shrink-0"></div>

                {/* Drop-off Location */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0 md:px-2">
                  <div className="w-8 h-8 rounded-full bg-[#C9A063]/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-[#C9A063]" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <label className="text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Drop-off</label>
                    <PlacesAutocomplete
                      value={dropoff}
                      onChange={setDropoff}
                      placeholder="Enter drop-off location"
                      className="text-[14px] sm:text-[15px] text-gray-900 placeholder:text-gray-400 outline-none bg-transparent w-full py-0.5 border-0 focus:ring-0"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="hidden md:block w-px self-stretch bg-gray-200 flex-shrink-0 mx-2"></div>
            <div className="md:hidden h-px w-full bg-gray-200 flex-shrink-0"></div>

            {/* Pick-up Time */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0 md:px-2 hero-datepicker">
              <div className="w-8 h-8 rounded-full bg-[#C9A063]/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-[#C9A063]" strokeWidth={2} />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <label className="text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Pick-up Time</label>
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
                  className="text-[14px] sm:text-[15px] text-gray-900 placeholder:text-gray-400 outline-none bg-transparent w-full py-0.5 border-0 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Duration Field - Only shows for Hourly mode */}
            {bookingMode === "hourly" && (
              <>
                <div className="hidden md:block w-px self-stretch bg-gray-200 flex-shrink-0 mx-2"></div>
                <div className="md:hidden h-px w-full bg-gray-200 flex-shrink-0"></div>

                <div className="flex items-center gap-2.5 flex-1 min-w-0 md:px-2 relative">
                  <div className="w-8 h-8 rounded-full bg-[#C9A063]/10 flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-4 h-4 text-[#C9A063]" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 relative">
                    <label className="text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                      Duration (in hours)
                      <span
                        className="text-[#C9A063] cursor-help"
                        title="Minimum 3 hours required for hourly booking"
                      >
                        <HelpCircle className="w-3 h-3" />
                      </span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setDurationDropdownOpen(!durationDropdownOpen)}
                        className="w-full flex items-center justify-between text-[14px] sm:text-[15px] text-gray-900 outline-none bg-transparent py-0.5"
                      >
                        <span>{duration} hours</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${durationDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {durationDropdownOpen && (
                        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-[200px] overflow-y-auto">
                          {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((hours) => (
                            <button
                              key={hours}
                              type="button"
                              onClick={() => {
                                setDuration(hours);
                                setDurationDropdownOpen(false);
                              }}
                              className={`w-full px-4 py-2.5 text-left text-[14px] hover:bg-[#C9A063]/10 transition-colors ${duration === hours ? 'bg-[#C9A063]/10 text-[#C9A063] font-semibold' : 'text-gray-700'
                                }`}
                            >
                              {hours} hours
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Next Button */}
            <div className="flex-shrink-0 mt-3 md:mt-0 md:ml-3">
              <button
                type="button"
                onClick={handleNext}
                className="w-full md:w-auto bg-gradient-to-r from-black via-gray-900 to-black text-white px-6 py-3 sm:px-7 sm:py-3.5 rounded-full text-[13px] sm:text-[14px] font-semibold hover:from-gray-900 hover:via-black hover:to-gray-900 hover:scale-105 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 backdrop-blur-sm border border-white/10 whitespace-nowrap"
              >
                Reserve
              </button>
            </div>
          </div>
        </div>
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
    </>
  );
}
