"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Clock, ChevronDown, HelpCircle, LocateFixed, Loader2 } from "lucide-react";
import DatePicker from "react-datepicker";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import { useGoogleMaps } from "@/components/GoogleMapsProvider";
import { APP_HOURLY_DURATIONS, APP_MIN_HOURLY_HOURS } from "@/lib/reservation-pricing";

const FIELD_INPUT =
  "text-base lg:text-[15px] text-gray-900 placeholder:text-gray-400 outline-none bg-transparent w-full min-h-11 lg:min-h-0 py-1.5 lg:py-0.5 border-0 focus:ring-0";
const FIELD_LABEL = "text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wide";

const Divider = () => (
  <>
    <div className="mx-2 hidden w-px flex-shrink-0 self-stretch bg-gray-200 lg:block" />
    <div className="h-px w-full flex-shrink-0 bg-gray-200 lg:hidden" />
  </>
);
const IconBubble = ({ children }: { children: React.ReactNode }) => (
  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#C9A063]/10">{children}</span>
);

/** The home page hero booking bar, unchanged in look and behaviour (hands off to /reservation). */
export default function LandingBookingForm({ pickupPlaceholder = "Enter pickup location" }: { pickupPlaceholder?: string }) {
  const router = useRouter();
  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const [bookingMode, setBookingMode] = useState<"distance" | "hourly">("distance");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupDateTime, setPickupDateTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState(APP_MIN_HOURLY_HOURS);
  const [durationOpen, setDurationOpen] = useState(false);
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
      async ({ coords: { latitude, longitude } }) => {
        try {
          if (!mapsLoaded || !window.google?.maps) {
            setPickup(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            return;
          }
          const geocoder = new window.google.maps.Geocoder();
          const address = await new Promise<string>((resolve, reject) => {
            geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
              if (status === "OK" && results?.[0]?.formatted_address) resolve(results[0].formatted_address);
              else reject(new Error(String(status)));
            });
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
        if (err.code === err.PERMISSION_DENIED) setLocationError("Location permission denied. Enable it in browser settings.");
        else if (err.code === err.TIMEOUT) setLocationError("Location request timed out. Try again.");
        else setLocationError("Could not get your location. Try again.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, [mapsLoaded]);

  const handleNext = () => {
    const params = new URLSearchParams();
    params.set("mode", bookingMode);
    if (pickup.trim()) params.set("pickup", pickup.trim());
    if (bookingMode === "distance" && dropoff.trim()) params.set("dropoff", dropoff.trim());
    if (pickupDateTime) params.set("date", pickupDateTime.toISOString());
    if (bookingMode === "hourly") params.set("duration", duration.toString());
    router.push(`/reservation?${params.toString()}`);
  };

  const toggleClass = (active: boolean) =>
    `relative px-6 sm:px-8 py-2.5 rounded-full text-[12px] sm:text-[13px] font-semibold tracking-wide transition-all duration-300 ${
      active ? "bg-gradient-to-r from-[#C9A063] to-[#D4AF6F] text-white shadow-lg" : "text-white/90 hover:text-white hover:bg-white/10"
    }`;

  return (
    <div id="book" className="mx-auto w-full max-w-[900px] scroll-mt-24 text-left">
      <div className="mb-4 flex justify-center">
        <div className="inline-flex rounded-full border border-[#C9A063]/30 bg-gradient-to-r from-[#1a1a2e]/90 to-[#16213e]/90 p-1 shadow-xl backdrop-blur-md">
          <button type="button" onClick={() => setBookingMode("distance")} className={toggleClass(bookingMode === "distance")}>
            DISTANCE
          </button>
          <button
            type="button"
            onClick={() => {
              setBookingMode("hourly");
              setDropoff("");
            }}
            className={toggleClass(bookingMode === "hourly")}
          >
            HOURLY
          </button>
        </div>
      </div>

      <div className="relative z-30 rounded-3xl bg-white px-4 py-4 shadow-2xl sm:px-5 sm:py-4 lg:rounded-full lg:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-0">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 lg:px-2">
            <IconBubble>
              <MapPin className="h-4 w-4 text-[#C9A063]" strokeWidth={2} />
            </IconBubble>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="mb-0.5 flex items-center justify-between gap-2">
                <label className={FIELD_LABEL}>Pickup</label>
                <button
                  type="button"
                  onClick={handleGetMyLocation}
                  disabled={locating}
                  className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold text-[#C9A063] transition-colors hover:text-[#B8935A] disabled:opacity-60 sm:text-[11px]"
                  title="Use your current location"
                >
                  {locating ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} /> : <LocateFixed className="h-3 w-3" strokeWidth={2.5} />}
                  {locating ? "Locating…" : "Get my location"}
                </button>
              </div>
              <PlacesAutocomplete
                value={pickup}
                onChange={(v) => {
                  setPickup(v);
                  if (locationError) setLocationError(null);
                }}
                placeholder={pickupPlaceholder}
                className={FIELD_INPUT}
              />
              {locationError && <p className="mt-0.5 text-[10px] leading-tight text-red-500">{locationError}</p>}
            </div>
          </div>

          {bookingMode === "distance" && (
            <>
              <Divider />
              <div className="flex min-w-0 flex-1 items-center gap-2.5 lg:px-2">
                <IconBubble>
                  <MapPin className="h-4 w-4 text-[#C9A063]" strokeWidth={2} />
                </IconBubble>
                <div className="flex min-w-0 flex-1 flex-col">
                  <label className={`${FIELD_LABEL} mb-0.5`}>Drop-off</label>
                  <PlacesAutocomplete value={dropoff} onChange={setDropoff} placeholder="Enter drop-off location" className={FIELD_INPUT} />
                </div>
              </div>
            </>
          )}

          <Divider />

          <div className="hero-datepicker flex min-w-0 flex-1 items-center gap-2.5 lg:px-2">
            <IconBubble>
              <Clock className="h-4 w-4 text-[#C9A063]" strokeWidth={2} />
            </IconBubble>
            <div className="flex min-w-0 flex-1 flex-col">
              <label className={`${FIELD_LABEL} mb-0.5`}>Pick-up Time</label>
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
                withPortal
                className={`${FIELD_INPUT} cursor-pointer`}
              />
            </div>
          </div>

          {bookingMode === "hourly" && (
            <>
              <Divider />
              <div className="relative flex min-w-0 flex-1 items-center gap-2.5 lg:px-2">
                <IconBubble>
                  <HelpCircle className="h-4 w-4 text-[#C9A063]" strokeWidth={2} />
                </IconBubble>
                <div className="relative flex min-w-0 flex-1 flex-col">
                  <label className={`${FIELD_LABEL} mb-0.5`}>Duration (in hours)</label>
                  <button
                    type="button"
                    onClick={() => setDurationOpen(!durationOpen)}
                    className="flex min-h-11 w-full items-center justify-between bg-transparent py-1.5 text-base text-gray-900 outline-none lg:min-h-0 lg:py-0.5 lg:text-[15px]"
                  >
                    <span>{duration} hours</span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${durationOpen ? "rotate-180" : ""}`} />
                  </button>
                  {durationOpen && (
                    <div className="absolute left-0 top-full z-50 mt-2 max-h-[200px] w-full overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-xl">
                      {APP_HOURLY_DURATIONS.map((hours) => (
                        <button
                          key={hours}
                          type="button"
                          onClick={() => {
                            setDuration(hours);
                            setDurationOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-[#C9A063]/10 ${
                            duration === hours ? "bg-[#C9A063]/10 font-semibold text-[#C9A063]" : "text-gray-700"
                          }`}
                        >
                          {hours} hours
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="mt-3 flex-shrink-0 lg:ml-3 lg:mt-0">
            <button
              type="button"
              onClick={handleNext}
              className="w-full whitespace-nowrap rounded-full border border-white/10 bg-gradient-to-r from-black via-gray-900 to-black px-6 py-3 text-[13px] font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] sm:px-7 sm:py-3.5 sm:text-[14px] lg:w-auto"
            >
              Reserve
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .hero-datepicker .react-datepicker-wrapper,
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
