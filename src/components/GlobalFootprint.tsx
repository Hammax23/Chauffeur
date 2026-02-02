"use client";

import Link from "next/link";
import { Wifi, MapPin } from "lucide-react";

const GlobalFootprint = () => {
  // Spread-out points with city names (akhatay removed – only these on map)
  const cities = [
    { name: "Toronto Pearson", left: "80%", top: "26%" },
    { name: "Hamilton", left: "68%", top: "26%" },
    { name: "London", left: "21%", top: "51%" },
    { name: "Ottawa", left: "62%", top: "48%" },
    { name: "Montreal", left: "86%", top: "68%" },
    { name: "Niagara/Buffalo", left: "75%", top: "65%" },
    { name: "Ottawa/Montreal", left: "58%", top: "44%" },
    { name: "Greater Toronto Area", left: "74%", top: "58%" },
  ];

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
          
          {/* <h2 className="text-gray-800 text-2xl sm:text-3xl md:text-4xl font-bold mb-4 tracking-tight">
           Cities We Serve
          </h2> */}
          <p className="text-gray-600 text-[15px] sm:text-[16px] md:text-[17px] tracking-wide font-light max-w-3xl mx-auto leading-relaxed">
            There&apos;s a reason for our elevated reputation worldwide. Experience luxury chauffeur services across major cities globally.
          </p>

          {/* Prominent CTA button - SS style, site colours + iOS effects */}
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
              {/* Top-edge highlight - iOS style */}
              <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" aria-hidden />
              <span className="relative">SERVICES AVAILABLE IN ALL CITIES</span>
            </Link>
          </div>
        </div>

        {/* World Map Container with iOS Effects */}
        <div className="relative w-full h-[500px] sm:h-[600px] md:h-[700px] lg:h-[750px] max-w-[1600px] mx-auto">
          {/* Dotted world map pattern */}
          <div 
            className="absolute inset-0 opacity-85"
            style={{
              backgroundImage: `
                radial-gradient(circle, rgba(30,30,30,0.8) 2.5px, transparent 2.5px),
                radial-gradient(circle, rgba(40,40,40,0.6) 1.5px, transparent 1.5px),
                radial-gradient(circle, rgba(50,50,50,0.18) 1px, transparent 1px),
                radial-gradient(circle, rgba(60,60,60,0.08) 0.8px, transparent 0.8px),
                radial-gradient(circle, rgba(70,70,70,0.03) 0.6px, transparent 0.6px)
              `,
              backgroundSize: '18px 18px, 11px 11px, 7px 7px, 4.5px 4.5px, 2.5px 2.5px',
              backgroundPosition: '0 0, 5.5px 5.5px, 3.5px 3.5px, 2.2px 2.2px, 1.2px 1.2px',
              maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 500'%3E%3Cpath fill='white' d='M80,120 L100,100 L150,110 L180,95 L200,110 L230,105 L250,120 L240,150 L220,160 L200,180 L180,190 L160,200 L140,180 L120,170 L90,160 L80,140 Z M300,80 L350,70 L400,85 L450,80 L480,95 L500,90 L530,105 L550,115 L540,140 L520,150 L500,170 L480,160 L460,140 L440,125 L420,110 L400,100 L380,95 L360,90 L340,95 L320,100 Z M180,220 L200,210 L220,220 L240,230 L250,250 L245,270 L235,290 L220,310 L200,320 L180,310 L170,290 L165,270 L170,250 L180,230 Z M600,100 L650,90 L700,95 L750,100 L800,95 L850,105 L880,120 L870,150 L850,165 L830,180 L810,190 L790,185 L770,175 L750,160 L730,145 L710,130 L690,115 L670,110 L650,110 L630,105 Z M820,220 L860,210 L900,220 L920,235 L910,260 L890,275 L870,270 L850,260 L830,245 Z M550,180 L590,170 L630,175 L670,185 L700,195 L720,210 L730,230 L720,260 L700,280 L680,295 L660,300 L640,295 L620,285 L600,270 L580,250 L565,230 L555,210 Z M600,320 L640,310 L680,320 L710,335 L730,355 L720,380 L700,395 L680,400 L660,395 L640,385 L620,370 L605,350 Z M850,350 L880,340 L910,350 L925,370 L920,390 L900,400 L880,395 L865,380 Z'/%3E%3C/svg%3E")`,
              WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 500'%3E%3Cpath fill='white' d='M80,120 L100,100 L150,110 L180,95 L200,110 L230,105 L250,120 L240,150 L220,160 L200,180 L180,190 L160,200 L140,180 L120,170 L90,160 L80,140 Z M300,80 L350,70 L400,85 L450,80 L480,95 L500,90 L530,105 L550,115 L540,140 L520,150 L500,170 L480,160 L460,140 L440,125 L420,110 L400,100 L380,95 L360,90 L340,95 L320,100 Z M180,220 L200,210 L220,220 L240,230 L250,250 L245,270 L235,290 L220,310 L200,320 L180,310 L170,290 L165,270 L170,250 L180,230 Z M600,100 L650,90 L700,95 L750,100 L800,95 L850,105 L880,120 L870,150 L850,165 L830,180 L810,190 L790,185 L770,175 L750,160 L730,145 L710,130 L690,115 L670,110 L650,110 L630,105 Z M820,220 L860,210 L900,220 L920,235 L910,260 L890,275 L870,270 L850,260 L830,245 Z M550,180 L590,170 L630,175 L670,185 L700,195 L720,210 L730,230 L720,260 L700,280 L680,295 L660,300 L640,295 L620,285 L600,270 L580,250 L565,230 L555,210 Z M600,320 L640,310 L680,320 L710,335 L730,355 L720,380 L700,395 L680,400 L660,395 L640,385 L620,370 L605,350 Z M850,350 L880,340 L910,350 L925,370 L920,390 L900,400 L880,395 L865,380 Z'/%3E%3C/svg%3E")`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center'
            }}
          />
          
          {/* City markers with iOS style */}
          <div className="absolute inset-0 z-20">
            {cities.map((city, i) => (
              <div
                key={i}
                className="absolute group cursor-pointer"
                style={{ left: city.left, top: city.top }}
              >
                {/* Pulsing dot - Made larger */}
                <div className="relative">
                  {/* Outer pulse ring */}
                  <div className="absolute -inset-6 bg-gradient-to-r from-[#C9A063] to-[#B8935A] rounded-full opacity-20 group-hover:opacity-40 transition-all duration-500 animate-ping"></div>
                  {/* Middle ring */}
                  <div className="absolute -inset-3 bg-[#C9A063]/30 rounded-full group-hover:bg-[#C9A063]/40 transition-all duration-300"></div>
                  {/* Main dot */}
                  <div className="relative w-6 h-6 bg-gradient-to-br from-[#C9A063] via-[#D4AF6A] to-[#B8935A] rounded-full shadow-2xl shadow-[#C9A063]/70 group-hover:scale-110 transition-all duration-300 border-[3px] border-white ring-2 ring-[#C9A063]/40 group-hover:ring-[#C9A063]/60">
                    {/* Inner glow */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-transparent"></div>
                  </div>
                </div>
                
                {/* City name - Simple stylish text */}
                <div className="absolute left-1/2 -translate-x-1/2 top-10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:-translate-y-1 z-30 pointer-events-none">
                  <span className="text-gray-900 text-[14px] sm:text-[15px] font-bold tracking-wider uppercase drop-shadow-[0_2px_8px_rgba(255,255,255,0.9)] [text-shadow:_0_1px_3px_rgb(255_255_255_/_80%)]">
                    {city.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Scattered diamond accents – on land only (within mask blobs) */}
          <div className="absolute inset-0">
            {[
              { left: '16%', top: '30%' },
              { left: '24%', top: '26%' },
              { left: '52%', top: '28%' },
              { left: '62%', top: '32%' },
              { left: '78%', top: '30%' },
              { left: '88%', top: '72%' },
            ].map((pos, i) => (
              <div
                key={i}
                className="absolute"
                style={{ left: pos.left, top: pos.top }}
              >
                <div className="relative">
                  <div className="absolute -inset-2 bg-[#C9A063]/20 rounded-full blur-sm"></div>
                  <div className="relative w-3 h-3 bg-gradient-to-br from-[#C9A063] to-[#B8935A] opacity-60 rotate-45 shadow-xl shadow-[#C9A063]/60 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Connecting lines effect */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C9A063" stopOpacity="0" />
                <stop offset="50%" stopColor="#C9A063" stopOpacity="1" />
                <stop offset="100%" stopColor="#C9A063" stopOpacity="0" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {/* Lines connecting spread-out city points */}
            <line x1="80%" y1="26%" x2="68%" y2="26%" stroke="url(#lineGradient)" strokeWidth="2.5" filter="url(#glow)" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite"/>
            </line>
            <line x1="68%" y1="26%" x2="62%" y2="48%" stroke="url(#lineGradient)" strokeWidth="2.5" filter="url(#glow)" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite"/>
            </line>
            <line x1="62%" y1="48%" x2="21%" y2="51%" stroke="url(#lineGradient)" strokeWidth="2.5" filter="url(#glow)" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite"/>
            </line>
            <line x1="21%" y1="51%" x2="74%" y2="58%" stroke="url(#lineGradient)" strokeWidth="2.5" filter="url(#glow)" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite"/>
            </line>
            <line x1="62%" y1="48%" x2="75%" y2="65%" stroke="url(#lineGradient)" strokeWidth="2.5" filter="url(#glow)" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite"/>
            </line>
            <line x1="75%" y1="65%" x2="86%" y2="68%" stroke="url(#lineGradient)" strokeWidth="2.5" filter="url(#glow)" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite"/>
            </line>
            <line x1="80%" y1="26%" x2="62%" y2="48%" stroke="url(#lineGradient)" strokeWidth="2.5" filter="url(#glow)" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite"/>
            </line>
          </svg>
        </div>

        {/* Technology Section */}
        <div className="-mt-6 sm:-mt-5 md:-mt-4 lg:-mt-3 max-w-[1100px] mx-auto">
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
                Enjoy use of WiFi to check your emails or browse the internet while traveling to your destination in our vehicles. Ask your chauffeur for more details.
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
                Each vehicle in our fleet is GPS tracked for safety and security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GlobalFootprint;
