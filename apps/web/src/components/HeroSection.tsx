"use client";
import { User, Mail, Phone, Plus, Trophy, Sparkles, ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// FIFA World Cup 2026 Promotional Banner
const FifaPromoBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-8 left-6 z-50 pointer-events-none">
      <div
        className="pointer-events-auto w-[300px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,160,99,0.3)' }}
      >
        {/* Image section */}
        <div className="relative w-full h-[160px]">
          <img
            src="/fifa.png"
            alt="FIFA World Cup 2026"
            className="w-full h-full object-cover object-center"
          />
          {/* Dark gradient over image bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent" />

          {/* Close button */}
          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <span className="text-white text-xs font-bold">✕</span>
          </button>

          {/* Badge */}
          <div className="absolute top-3 left-3 bg-gradient-to-r from-[#C9A063] to-[#8B6914] text-black text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
            Exclusive Offer
          </div>
        </div>

        {/* Content section */}
        <div className="bg-[#0f0f0f] px-4 py-3">
          <p className="text-[#C9A063] text-[11px] font-bold uppercase tracking-widest mb-1">FIFA World Cup 2026</p>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-white text-3xl font-black">15% OFF</span>
            <span className="text-white/50 text-xs">on all rides</span>
          </div>
          <p className="text-white/50 text-[11px] mb-3">Book your luxury chauffeur for FIFA events across Canada.</p>
          <Link
            href="/reservation?promo=FIFA2026"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C9A063] to-[#8B6914] hover:from-[#D4AF37] hover:to-[#C9A063] text-black font-bold text-xs uppercase tracking-wide transition-all duration-300"
          >
            Book Now
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

const heroServices = [
  { title: "Airport Transfers", href: "/services/airport-transfers", image: "/heropics/airportTransfers.png" },
  { title: "Corporate Travel", href: "/services/corporate-travel", image: "/heropics/buisnesstravel.png" },
  { title: "Wedding & Events", href: "/services/wedding-events", image: "/heropics/weddingsandevent.png" },
  { title: "Hourly Chauffeur", href: "/services/hourly-chauffeur", image: "/heropics/hourlyasdirected.png" },
];

const HeroSection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
      // Set up optimized loading
      video.addEventListener('loadeddata', handleVideoLoad);
      video.addEventListener('error', handleVideoError);
      
      // Try to load the video
      video.load();
      
      return () => {
        video.removeEventListener('loadeddata', handleVideoLoad);
        video.removeEventListener('error', handleVideoError);
      };
    }
  }, [handleVideoLoad, handleVideoError]);

  const handleNext = () => {
    const params = new URLSearchParams();
    if (fullName.trim()) params.set("name", fullName.trim());
    if (email.trim()) params.set("email", email.trim());
    if (phone.trim()) params.set("phone", phone.trim());
    router.push(`/contact${params.toString() ? "?" + params.toString() : ""}`);
  };

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* FIFA World Cup 2026 Promotional Banner */}
      <FifaPromoBanner />
      
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

        <div id="book" className="w-full max-w-[720px] mt-4 sm:mt-6 md:mt-8 lg:mt-10 mb-8 sm:mb-10 mx-auto px-4 sm:px-6 md:px-8">
          <div className="bg-white rounded-3xl md:rounded-full shadow-2xl px-4 py-3 sm:px-5 sm:py-3 md:px-5 md:py-3">
            <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap lg:items-center gap-2.5 sm:gap-2.5 lg:gap-3 overflow-hidden">
              <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0 basis-0 lg:min-w-0 lg:max-w-[180px]">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" strokeWidth={1.5} />
                <div className="flex flex-col flex-1 min-w-0">
                  <label className="text-[12px] sm:text-[13px] md:text-[14px] font-semibold text-gray-900 mb-1 block">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    className="text-[13px] sm:text-[14px] md:text-[15px] text-gray-700 placeholder:text-gray-400 outline-none bg-transparent w-full min-h-[36px] py-1 border-0 focus:ring-0"
                  />
                </div>
              </div>

              <div className="hidden md:block w-px self-center h-8 bg-gray-300 flex-shrink-0"></div>
              <div className="md:hidden h-px w-full bg-gray-200 flex-shrink-0"></div>

              <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0 basis-0 lg:min-w-0 lg:max-w-[180px]">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" strokeWidth={1.5} />
                <div className="flex flex-col flex-1 min-w-0">
                  <label className="text-[12px] sm:text-[13px] md:text-[14px] font-semibold text-gray-900 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="text-[13px] sm:text-[14px] md:text-[15px] text-gray-700 placeholder:text-gray-400 outline-none bg-transparent w-full min-h-[36px] py-1 border-0 focus:ring-0"
                  />
                </div>
              </div>

              <div className="hidden md:block w-px self-center h-8 bg-gray-300 flex-shrink-0"></div>
              <div className="md:hidden h-px w-full bg-gray-200 flex-shrink-0"></div>

              <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0 basis-0 lg:min-w-0 lg:max-w-[180px]">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" strokeWidth={1.5} />
                <div className="flex flex-col flex-1 min-w-0">
                  <label className="text-[12px] sm:text-[13px] md:text-[14px] font-semibold text-gray-900 mb-1 block">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="416-893-5779"
                    className="text-[13px] sm:text-[14px] md:text-[15px] text-gray-700 placeholder:text-gray-400 outline-none bg-transparent w-full min-h-[36px] py-1 border-0 focus:ring-0"
                  />
                </div>
              </div>

              <div className="w-full md:w-auto flex-shrink-0 mt-3 md:mt-0 lg:ml-0 flex items-center justify-center md:justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full md:w-auto bg-gradient-to-r from-black via-gray-900 to-black text-white px-5 py-2.5 sm:px-5 sm:py-3 md:px-6 md:py-3 rounded-full text-[13px] sm:text-[14px] font-semibold hover:from-gray-900 hover:via-black hover:to-gray-900 hover:scale-105 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 backdrop-blur-sm border border-white/10 whitespace-nowrap min-h-[40px]"
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
    </section>
  );
};

export default HeroSection;
