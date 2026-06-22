"use client";
import { MapPin, Clock, Plus, ChevronDown, HelpCircle } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import PlacesAutocomplete from '@/components/PlacesAutocomplete';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const heroServices = [
  { title: "Airport Transfers", href: "/services/airport-transfers", image: "/heropics/airportTransfers.png" },
  { title: "Corporate Travel", href: "/services/corporate-travel", image: "/heropics/buisnesstravel.png" },
  { title: "Wedding & Events", href: "/services/wedding-events", image: "/heropics/weddingsandevent.png" },
  { title: "Hourly Chauffeur", href: "/services/hourly-chauffeur", image: "/heropics/hourlyasdirected.png" },
];

const HeroSection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const [bookingMode, setBookingMode] = useState<"distance" | "hourly">("distance");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupDateTime, setPickupDateTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState(3);
  const [durationDropdownOpen, setDurationDropdownOpen] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const handleVideoLoad = useCallback(() => {
    setVideoLoaded(true);
  }, []);

  const handleVideoError = useCallback(() => {
    setVideoError(true);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.addEventListener('loadeddata', handleVideoLoad);
      video.addEventListener('error', handleVideoError);
      video.load();
      
      return () => {
        video.removeEventListener('loadeddata', handleVideoLoad);
        video.removeEventListener('error', handleVideoError);
      };
    }
  }, [handleVideoLoad, handleVideoError]);

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
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Fallback background image while video loads */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/cover-poster.jpg)',
          opacity: videoLoaded ? 0 : 1,
          transition: 'opacity 0.5s ease-in-out'
        }}
      />
      
      {/* Optimized video loading */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="none"
        poster="/cover-poster.jpg"
        onLoadedData={handleVideoLoad}
        onError={handleVideoError}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          videoLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          willChange: 'opacity'
        }}
      >
        <source src="/cover.mp4" type="video/mp4" />
      </video>
      
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 flex flex-col min-h-screen pt-[130px] sm:pt-[145px]">
        <div className="max-w-[1600px] mx-auto w-full px-8">
          <div className="text-left mb-4 sm:mb-6 md:mb-8 mt-32 sm:mt-40 md:mt-48 lg:mt-56 max-w-[800px] lg:ml-[240px]">
          <p className="text-white/90 text-sm sm:text-base md:text-lg mb-3 sm:mb-4 font-normal tracking-wide">
            Where Would You Like To Go?
          </p>
          <h1 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-medium leading-tight">
            Your Personal Certified
            <br />
            Chauffeurd Services
          </h1>
          </div>
        </div>

        <div id="book" className="w-full max-w-[900px] mt-4 sm:mt-6 md:mt-8 lg:mt-10 mb-8 sm:mb-10 mx-auto px-4 sm:px-6 md:px-8">
          {/* Booking Mode Toggle */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex rounded-full p-1 bg-gradient-to-r from-[#1a1a2e]/90 to-[#16213e]/90 backdrop-blur-md border border-[#C9A063]/30 shadow-xl">
              <button
                type="button"
                onClick={() => setBookingMode("distance")}
                className={`relative px-6 sm:px-8 py-2.5 rounded-full text-[12px] sm:text-[13px] font-semibold tracking-wide transition-all duration-300 ${
                  bookingMode === "distance"
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
                className={`relative px-6 sm:px-8 py-2.5 rounded-full text-[12px] sm:text-[13px] font-semibold tracking-wide transition-all duration-300 ${
                  bookingMode === "hourly"
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
                  <label className="text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Pickup</label>
                  <PlacesAutocomplete
                    value={pickup}
                    onChange={setPickup}
                    placeholder="Enter pickup location"
                    className="text-[14px] sm:text-[15px] text-gray-900 placeholder:text-gray-400 outline-none bg-transparent w-full py-0.5 border-0 focus:ring-0"
                  />
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
                                className={`w-full px-4 py-2.5 text-left text-[14px] hover:bg-[#C9A063]/10 transition-colors ${
                                  duration === hours ? 'bg-[#C9A063]/10 text-[#C9A063] font-semibold' : 'text-gray-700'
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
                  NEXT
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Service Cards - Right Side Vertical */}
        <div className="hidden lg:flex absolute right-6 xl:right-10 top-[55%] -translate-y-1/2 z-20 flex-col gap-5">
          {heroServices.map((service, index) => (
            <Link
              key={index}
              href={service.href}
              className="group relative w-[100px] h-[100px] xl:w-[115px] xl:h-[115px] overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:border-[#C9A063]/40 transition-all duration-500 shadow-md hover:shadow-lg opacity-80 hover:opacity-100"
            >
              <Image
                src={service.image}
                alt={service.title}
                fill
                className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
              />
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/40 to-transparent" />
              
              {/* Plus Icon - appears on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-[#C9A063] flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300">
                  <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
              </div>

              {/* Title */}
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <h3 className="text-white text-[10px] xl:text-xs font-semibold tracking-wide uppercase text-center group-hover:text-[#C9A063] transition-colors duration-300 leading-tight">
                  {service.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile Service Cards - Bottom */}
        <div className="lg:hidden w-full px-4 pb-8">
          <div className="grid grid-cols-4 gap-2">
            {heroServices.map((service, index) => (
              <Link
                key={index}
                href={service.href}
                className="group relative aspect-square overflow-hidden rounded-lg bg-black/30 backdrop-blur-sm border border-white/20"
              >
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-contain p-1 opacity-80 group-hover:opacity-100 transition-all duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-1.5">
                  <h3 className="text-white text-[8px] sm:text-[9px] font-semibold uppercase text-center leading-tight">
                    {service.title}
                  </h3>
                </div>
              </Link>
            ))}
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
    </section>
  );
};

export default HeroSection;
