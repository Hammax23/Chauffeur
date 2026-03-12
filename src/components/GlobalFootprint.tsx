"use client";

import Link from "next/link";
import { Wifi, MapPin } from "lucide-react";
import Image from "next/image";

const GlobalFootprint = () => {

  return (
    <section className="relative py-12 sm:py-14 md:py-16 lg:py-18 bg-white overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C9A063]/2 via-transparent to-[#C9A063]/1"></div>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-radial from-[#C9A063]/2 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-[#C9A063]/2 to-transparent rounded-full blur-3xl"></div>
        {/* Decorative lines */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#C9A063]/10 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#C9A063]/10 to-transparent"></div>
      </div>

      <div className="max-w-[1800px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-7 md:mb-8">
          <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white backdrop-blur-xl border border-[#C9A063]/30 shadow-xl shadow-[#C9A063]/10 mb-6 sm:mb-8 hover:shadow-2xl hover:shadow-[#C9A063]/20 transition-all duration-300">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#C9A063] to-[#B8935A] animate-pulse shadow-lg shadow-[#C9A063]/50"></div>
            <span className="text-gray-800 text-[13px] sm:text-[14px] font-bold tracking-[0.2em] uppercase">Cities We Serve</span>
          </div>
          
          <p className="text-gray-600 text-[15px] sm:text-[16px] md:text-[17px] tracking-wide font-light max-w-3xl mx-auto leading-relaxed">
            There&apos;s a reason for our elevated reputation worldwide. Experience luxury chauffeur services across major cities globally.
          </p>

          {/* Prominent CTA button */}
          <div className="mt-6 sm:mt-8 flex justify-center">
            <Link
              href="/cities-we-serve"
              className="relative block w-full max-w-xl py-3 sm:py-3.5 rounded-lg overflow-hidden text-center
                bg-gradient-to-b from-[#9A8059] via-[#8B7355] to-[#6B5644]
                hover:from-[#8B7355] hover:via-[#7A6549] hover:to-[#5C4A3A]
                active:scale-[0.98] active:shadow-[0_2px_12px_rgba(139,115,85,0.3)]
                text-white text-[12px] sm:text-[13px] md:text-[14px] font-semibold tracking-[0.12em] uppercase underline underline-offset-4 decoration-2
                transition-all duration-300 ease-out
                border border-[#A68B5B]/40 border-t-white/20
                shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_4px_16px_rgba(139,115,85,0.25),0_8px_24px_-4px_rgba(0,0,0,0.15)]
                hover:shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_6px_24px_rgba(139,115,85,0.35),0_12px_32px_-6px_rgba(0,0,0,0.12)]"
            >
              <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" aria-hidden />
              <span className="relative">SERVICES AVAILABLE IN ALL CITIES</span>
            </Link>
          </div>
        </div>

        {/* Map Image Container */}
        <div className="relative w-full h-[400px] sm:h-[500px] md:h-[600px] lg:h-[700px] mx-auto overflow-hidden">
          <Image
            src="/map.png"
            alt="Cities We Serve - SARJ Worldwide Coverage Map"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Technology Section */}
        <div className="mt-10 sm:mt-12 md:mt-14 lg:mt-16 max-w-[1100px] mx-auto">
          <h3 className="text-gray-500 text-xl sm:text-2xl md:text-3xl font-light tracking-[0.25em] uppercase mb-4 text-center">
           SARJ Worldwide Technology
          </h3>
          <div className="w-16 h-px bg-gray-300 mx-auto mb-10 sm:mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* WIFI */}
            <div className="flex flex-col items-center text-center p-6 sm:p-8 rounded-2xl bg-white border border-gray-100 shadow-lg shadow-gray-100/80 hover:shadow-xl hover:shadow-[#C9A063]/10 hover:border-[#C9A063]/20 transition-all duration-300">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-[#C9A063]/10 to-[#8B7355]/5 border border-gray-200 flex items-center justify-center mb-5 sm:mb-6">
                <Wifi className="w-12 h-12 sm:w-14 sm:h-14 text-[#8B7355]" strokeWidth={1.5} />
              </div>
              <h4 className="text-[#8B7355] text-[15px] sm:text-[16px] font-bold tracking-[0.15em] uppercase mb-3">
                Wifi
              </h4>
              <p className="text-gray-500 text-[14px] sm:text-[15px] leading-relaxed max-w-sm mx-auto font-light">
              Enjoy WIFI in our vehicles to check your emails/browse internet while traveling to your destination. Ask your chauffeur for more info.
              </p>
            </div>
            {/* Vehicle Tracking */}
            <div className="flex flex-col items-center text-center p-6 sm:p-8 rounded-2xl bg-white border border-gray-100 shadow-lg shadow-gray-100/80 hover:shadow-xl hover:shadow-[#C9A063]/10 hover:border-[#C9A063]/20 transition-all duration-300">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-[#C9A063]/10 to-[#8B7355]/5 border border-gray-200 flex items-center justify-center mb-5 sm:mb-6">
                <MapPin className="w-12 h-12 sm:w-14 sm:h-14 text-[#8B7355]" strokeWidth={1.5} />
              </div>
              <h4 className="text-[#8B7355] text-[15px] sm:text-[16px] font-bold tracking-[0.15em] uppercase mb-3">
                Vehicle Tracking
              </h4>
              <p className="text-gray-500 text-[14px] sm:text-[15px] leading-relaxed max-w-sm mx-auto font-light">
              For safety and security each vehicle in our fleet is GPS tracked.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GlobalFootprint;
