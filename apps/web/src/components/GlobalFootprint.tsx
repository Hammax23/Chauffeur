"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Wifi, MapPin, Clock, Shield } from "lucide-react";
import { SERVICE_CITIES, type ServiceCity } from "@/data/service-cities";

// Dotted map coordinates for Ontario & Quebec region (simplified dot grid)
const MAP_DOTS: { x: number; y: number; province: 'ON' | 'QC' }[] = [];

// Generate dot grid for Ontario (left side)
for (let row = 0; row < 12; row++) {
  for (let col = 0; col < 16; col++) {
    // Ontario shape approximation
    const inOntario = 
      (row >= 3 && row <= 10 && col >= 0 && col <= 8) ||
      (row >= 2 && row <= 8 && col >= 2 && col <= 6) ||
      (row >= 4 && row <= 9 && col >= 6 && col <= 10) ||
      (row >= 5 && row <= 8 && col >= 8 && col <= 11);
    
    if (inOntario) {
      MAP_DOTS.push({ x: 80 + col * 28, y: 60 + row * 28, province: 'ON' });
    }
  }
}

// Generate dot grid for Quebec (right side)
for (let row = 0; row < 10; row++) {
  for (let col = 0; col < 12; col++) {
    // Quebec shape approximation
    const inQuebec = 
      (row >= 1 && row <= 7 && col >= 10 && col <= 18) ||
      (row >= 0 && row <= 5 && col >= 12 && col <= 20) ||
      (row >= 2 && row <= 6 && col >= 14 && col <= 22);
    
    if (inQuebec) {
      MAP_DOTS.push({ x: 80 + col * 28, y: 60 + row * 28, province: 'QC' });
    }
  }
}

// City positions on dotted map (x, y coordinates) - full width version
const CITY_POSITIONS: Record<string, { x: number; y: number }> = {
  windsor: { x: 70, y: 340 },
  london: { x: 140, y: 295 },
  kitchener: { x: 210, y: 250 },
  hamilton: { x: 305, y: 300 },
  burlington: { x: 280, y: 280 },
  niagara: { x: 370, y: 330 },
  oakville: { x: 340, y: 265 },
  mississauga: { x: 385, y: 245 },
  toronto: { x: 420, y: 225 },
  markham: { x: 475, y: 210 },
  barrie: { x: 395, y: 165 },
  kingston: { x: 620, y: 205 },
  ottawa: { x: 730, y: 175 },
  montreal: { x: 900, y: 145 },
  laval: { x: 945, y: 120 },
  "quebec-city": { x: 1120, y: 70 },
};

function CityMarker({
  city,
  active,
  onEnter,
  onLeave,
}: {
  city: ServiceCity;
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const pos = CITY_POSITIONS[city.id];
  if (!pos) return null;
  
  const isHub = city.hub;

  return (
    <g 
      onMouseEnter={onEnter} 
      onMouseLeave={onLeave} 
      style={{ cursor: "pointer" }}
    >
      {/* Pulse animation for active/hub */}
      {(active || isHub) && (
        <circle
          cx={pos.x}
          cy={pos.y}
          r={isHub ? 20 : 16}
          fill="none"
          stroke="#C9A063"
          strokeWidth={1.5}
          opacity={0.4}
        >
          <animate
            attributeName="r"
            from={isHub ? 12 : 10}
            to={isHub ? 24 : 20}
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            from="0.6"
            to="0"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
      )}
      
      {/* Glow circle */}
      {(active || isHub) && (
        <circle
          cx={pos.x}
          cy={pos.y}
          r={isHub ? 14 : 11}
          fill={isHub ? "rgba(201,160,99,0.15)" : "rgba(201,160,99,0.1)"}
        />
      )}
      
      {/* Main marker */}
      <circle
        cx={pos.x}
        cy={pos.y}
        r={isHub ? 8 : 6}
        fill={active ? "#C9A063" : isHub ? "#C9A063" : "#8B7355"}
        stroke="#fff"
        strokeWidth={2.5}
        filter="url(#markerShadow)"
      />
      
      {/* Inner dot for hubs */}
      {isHub && (
        <circle
          cx={pos.x}
          cy={pos.y}
          r={3}
          fill="#fff"
        />
      )}
      
      {/* City label */}
      <text
        x={pos.x}
        y={pos.y + (isHub ? 22 : 18)}
        textAnchor="middle"
        fill={active ? "#1a1a1a" : "#4a5568"}
        fontSize={isHub ? 11 : 10}
        fontWeight={isHub ? 600 : 500}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {city.name}
      </text>
    </g>
  );
}

const GlobalFootprint = () => {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <section className="relative py-16 sm:py-20 md:py-24 bg-gradient-to-b from-[#fafbfc] to-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <div className="inline-flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-white border border-gray-200 shadow-sm mb-6 sm:mb-8">
            <div className="w-2.5 h-2.5 rounded-full bg-[#C9A063]" />
            <span className="text-[#1a1a1a] text-xs sm:text-sm font-bold tracking-[0.2em] uppercase">
              Cities We Serve
            </span>
          </div>

          <p className="text-gray-500 text-base sm:text-lg tracking-wide font-light max-w-3xl mx-auto leading-relaxed">
            There&apos;s a reason for our elevated reputation worldwide. Experience luxury chauffeur services across
            major cities globally.
          </p>

          <div className="mt-6 sm:mt-8 flex justify-center">
            <Link
              href="/cities-we-serve"
              className="relative block w-full max-w-xl py-3 sm:py-3.5 rounded-lg overflow-hidden text-center
                bg-gradient-to-b from-[#9A8059] via-[#8B7355] to-[#6B5644]
                hover:from-[#8B7355] hover:via-[#7A6549] hover:to-[#5C4A3A]
                active:scale-[0.98]
                text-white text-[12px] sm:text-[13px] font-semibold tracking-[0.12em] uppercase underline underline-offset-4 decoration-1
                shadow-lg shadow-[#8B7355]/20 hover:shadow-xl hover:shadow-[#8B7355]/30 transition-all duration-300"
            >
              <span className="relative">Services Available In All Cities</span>
            </Link>
          </div>
        </div>

        {/* Dotted Map */}
        <div className="relative mb-8">
          <div className="relative bg-transparent overflow-hidden p-2 sm:p-4">
            <svg
              viewBox="0 50 1200 350"
              className="w-full h-auto"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <filter id="markerShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#8B7355" floodOpacity="0.3"/>
                </filter>
                <linearGradient id="dotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C9A063" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#8B7355" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              
              {/* Background pattern */}
              <rect x="0" y="0" width="1200" height="400" fill="transparent" />
              
              {/* Dotted land mass - Full width, r=4, 25px gap */}
              {/* Ontario - Row 1 */}
              <circle cx="225" cy="140" r="4" fill="#e5e0d5" />
              <circle cx="250" cy="140" r="4" fill="#e5e0d5" />
              <circle cx="275" cy="140" r="4" fill="#e2dcd2" />
              <circle cx="300" cy="140" r="4" fill="#e0dbd0" />
              <circle cx="325" cy="140" r="4" fill="#ddd8ce" />
              <circle cx="350" cy="140" r="4" fill="#e0dbd0" />
              <circle cx="375" cy="140" r="4" fill="#e2dcd2" />
              
              {/* Ontario - Row 2 */}
              <circle cx="200" cy="165" r="4" fill="#e5e0d5" />
              <circle cx="225" cy="165" r="4" fill="#e2dcd2" />
              <circle cx="250" cy="165" r="4" fill="#ddd8ce" />
              <circle cx="275" cy="165" r="4" fill="#d8d2c6" />
              <circle cx="300" cy="165" r="4" fill="#d5cfc2" />
              <circle cx="325" cy="165" r="4" fill="#d5cfc2" />
              <circle cx="350" cy="165" r="4" fill="#d8d2c6" />
              <circle cx="375" cy="165" r="4" fill="#ddd8ce" />
              <circle cx="400" cy="165" r="4" fill="#e2dcd2" />
              <circle cx="425" cy="165" r="4" fill="#e5e0d5" />
              
              {/* Ontario - Row 3 */}
              <circle cx="175" cy="190" r="4" fill="#e5e0d5" />
              <circle cx="200" cy="190" r="4" fill="#e0dbd0" />
              <circle cx="225" cy="190" r="4" fill="#d8d2c6" />
              <circle cx="250" cy="190" r="4" fill="#d5cfc2" />
              <circle cx="275" cy="190" r="4" fill="#d0c9bb" />
              <circle cx="300" cy="190" r="4" fill="#ccc4b5" />
              <circle cx="325" cy="190" r="4" fill="#ccc4b5" />
              <circle cx="350" cy="190" r="4" fill="#d0c9bb" />
              <circle cx="375" cy="190" r="4" fill="#d5cfc2" />
              <circle cx="400" cy="190" r="4" fill="#d8d2c6" />
              <circle cx="425" cy="190" r="4" fill="#ddd8ce" />
              <circle cx="450" cy="190" r="4" fill="#e2dcd2" />
              <circle cx="475" cy="190" r="4" fill="#e5e0d5" />
              
              {/* Ontario - Row 4 */}
              <circle cx="150" cy="215" r="4" fill="#e5e0d5" />
              <circle cx="175" cy="215" r="4" fill="#e0dbd0" />
              <circle cx="200" cy="215" r="4" fill="#d8d2c6" />
              <circle cx="225" cy="215" r="4" fill="#d5cfc2" />
              <circle cx="250" cy="215" r="4" fill="#d0c9bb" />
              <circle cx="275" cy="215" r="4" fill="#c7bfae" />
              <circle cx="300" cy="215" r="4" fill="#c2b9a7" />
              <circle cx="325" cy="215" r="4" fill="#c2b9a7" />
              <circle cx="350" cy="215" r="4" fill="#c7bfae" />
              <circle cx="375" cy="215" r="4" fill="#ccc4b5" />
              <circle cx="400" cy="215" r="4" fill="#d0c9bb" />
              <circle cx="425" cy="215" r="4" fill="#d5cfc2" />
              <circle cx="450" cy="215" r="4" fill="#d8d2c6" />
              <circle cx="475" cy="215" r="4" fill="#ddd8ce" />
              <circle cx="500" cy="215" r="4" fill="#e2dcd2" />
              <circle cx="525" cy="215" r="4" fill="#e5e0d5" />
              
              {/* Ontario - Row 5 */}
              <circle cx="125" cy="240" r="4" fill="#e5e0d5" />
              <circle cx="150" cy="240" r="4" fill="#e0dbd0" />
              <circle cx="175" cy="240" r="4" fill="#d8d2c6" />
              <circle cx="200" cy="240" r="4" fill="#d5cfc2" />
              <circle cx="225" cy="240" r="4" fill="#d0c9bb" />
              <circle cx="250" cy="240" r="4" fill="#c7bfae" />
              <circle cx="275" cy="240" r="4" fill="#c2b9a7" />
              <circle cx="300" cy="240" r="4" fill="#bdb4a0" />
              <circle cx="325" cy="240" r="4" fill="#bdb4a0" />
              <circle cx="350" cy="240" r="4" fill="#c2b9a7" />
              <circle cx="375" cy="240" r="4" fill="#c7bfae" />
              <circle cx="400" cy="240" r="4" fill="#ccc4b5" />
              <circle cx="425" cy="240" r="4" fill="#d0c9bb" />
              <circle cx="450" cy="240" r="4" fill="#d5cfc2" />
              <circle cx="475" cy="240" r="4" fill="#d8d2c6" />
              <circle cx="500" cy="240" r="4" fill="#ddd8ce" />
              <circle cx="525" cy="240" r="4" fill="#e2dcd2" />
              
              {/* Ontario - Row 6 */}
              <circle cx="100" cy="265" r="4" fill="#e5e0d5" />
              <circle cx="125" cy="265" r="4" fill="#e0dbd0" />
              <circle cx="150" cy="265" r="4" fill="#d8d2c6" />
              <circle cx="175" cy="265" r="4" fill="#d5cfc2" />
              <circle cx="200" cy="265" r="4" fill="#d0c9bb" />
              <circle cx="225" cy="265" r="4" fill="#c7bfae" />
              <circle cx="250" cy="265" r="4" fill="#c2b9a7" />
              <circle cx="275" cy="265" r="4" fill="#bdb4a0" />
              <circle cx="300" cy="265" r="4" fill="#b8af9a" />
              <circle cx="325" cy="265" r="4" fill="#b8af9a" />
              <circle cx="350" cy="265" r="4" fill="#bdb4a0" />
              <circle cx="375" cy="265" r="4" fill="#c2b9a7" />
              <circle cx="400" cy="265" r="4" fill="#c7bfae" />
              <circle cx="425" cy="265" r="4" fill="#ccc4b5" />
              <circle cx="450" cy="265" r="4" fill="#d5cfc2" />
              <circle cx="475" cy="265" r="4" fill="#ddd8ce" />
              <circle cx="500" cy="265" r="4" fill="#e2dcd2" />
              
              {/* Ontario - Row 7 */}
              <circle cx="75" cy="290" r="4" fill="#e5e0d5" />
              <circle cx="100" cy="290" r="4" fill="#e0dbd0" />
              <circle cx="125" cy="290" r="4" fill="#d8d2c6" />
              <circle cx="150" cy="290" r="4" fill="#d5cfc2" />
              <circle cx="175" cy="290" r="4" fill="#d0c9bb" />
              <circle cx="200" cy="290" r="4" fill="#c7bfae" />
              <circle cx="225" cy="290" r="4" fill="#c2b9a7" />
              <circle cx="250" cy="290" r="4" fill="#bdb4a0" />
              <circle cx="275" cy="290" r="4" fill="#b8af9a" />
              <circle cx="300" cy="290" r="4" fill="#b8af9a" />
              <circle cx="325" cy="290" r="4" fill="#bdb4a0" />
              <circle cx="350" cy="290" r="4" fill="#c2b9a7" />
              <circle cx="375" cy="290" r="4" fill="#ccc4b5" />
              <circle cx="400" cy="290" r="4" fill="#d0c9bb" />
              <circle cx="425" cy="290" r="4" fill="#d8d2c6" />
              <circle cx="450" cy="290" r="4" fill="#e0dbd0" />
              
              {/* Ontario - Row 8 */}
              <circle cx="50" cy="315" r="4" fill="#e5e0d5" />
              <circle cx="75" cy="315" r="4" fill="#e0dbd0" />
              <circle cx="100" cy="315" r="4" fill="#d8d2c6" />
              <circle cx="125" cy="315" r="4" fill="#d5cfc2" />
              <circle cx="150" cy="315" r="4" fill="#d0c9bb" />
              <circle cx="175" cy="315" r="4" fill="#c7bfae" />
              <circle cx="200" cy="315" r="4" fill="#c2b9a7" />
              <circle cx="225" cy="315" r="4" fill="#bdb4a0" />
              <circle cx="250" cy="315" r="4" fill="#bdb4a0" />
              <circle cx="275" cy="315" r="4" fill="#c2b9a7" />
              <circle cx="300" cy="315" r="4" fill="#c7bfae" />
              <circle cx="325" cy="315" r="4" fill="#ccc4b5" />
              <circle cx="350" cy="315" r="4" fill="#d5cfc2" />
              <circle cx="375" cy="315" r="4" fill="#ddd8ce" />
              
              {/* Ontario - Row 9 */}
              <circle cx="50" cy="340" r="4" fill="#e2dcd2" />
              <circle cx="75" cy="340" r="4" fill="#ddd8ce" />
              <circle cx="100" cy="340" r="4" fill="#d5cfc2" />
              <circle cx="125" cy="340" r="4" fill="#d0c9bb" />
              <circle cx="150" cy="340" r="4" fill="#c7bfae" />
              <circle cx="175" cy="340" r="4" fill="#c2b9a7" />
              <circle cx="200" cy="340" r="4" fill="#bdb4a0" />
              <circle cx="225" cy="340" r="4" fill="#c2b9a7" />
              <circle cx="250" cy="340" r="4" fill="#ccc4b5" />
              <circle cx="275" cy="340" r="4" fill="#d5cfc2" />
              <circle cx="300" cy="340" r="4" fill="#ddd8ce" />
              
              {/* Ontario - Row 10 */}
              <circle cx="50" cy="365" r="4" fill="#e2dcd2" />
              <circle cx="75" cy="365" r="4" fill="#ddd8ce" />
              <circle cx="100" cy="365" r="4" fill="#d5cfc2" />
              <circle cx="125" cy="365" r="4" fill="#d0c9bb" />
              <circle cx="150" cy="365" r="4" fill="#ccc4b5" />
              <circle cx="175" cy="365" r="4" fill="#d0c9bb" />
              <circle cx="200" cy="365" r="4" fill="#d8d2c6" />
              <circle cx="225" cy="365" r="4" fill="#e0dbd0" />
              
              {/* Connection Ontario to Quebec */}
              <circle cx="550" cy="190" r="4" fill="#e5e0d5" />
              <circle cx="575" cy="190" r="4" fill="#e2dcd2" />
              <circle cx="600" cy="190" r="4" fill="#e0dbd0" />
              <circle cx="625" cy="190" r="4" fill="#ddd8ce" />
              <circle cx="650" cy="190" r="4" fill="#e0dbd0" />
              
              <circle cx="575" cy="165" r="4" fill="#e5e0d5" />
              <circle cx="600" cy="165" r="4" fill="#e2dcd2" />
              <circle cx="625" cy="165" r="4" fill="#ddd8ce" />
              <circle cx="650" cy="165" r="4" fill="#d8d2c6" />
              <circle cx="675" cy="165" r="4" fill="#d5cfc2" />
              <circle cx="700" cy="165" r="4" fill="#d8d2c6" />
              <circle cx="725" cy="165" r="4" fill="#ddd8ce" />
              
              {/* Quebec - Row 1 */}
              <circle cx="675" cy="140" r="4" fill="#e5e0d5" />
              <circle cx="700" cy="140" r="4" fill="#e2dcd2" />
              <circle cx="725" cy="140" r="4" fill="#ddd8ce" />
              <circle cx="750" cy="140" r="4" fill="#d8d2c6" />
              <circle cx="775" cy="140" r="4" fill="#d5cfc2" />
              <circle cx="800" cy="140" r="4" fill="#d0c9bb" />
              <circle cx="825" cy="140" r="4" fill="#d5cfc2" />
              <circle cx="850" cy="140" r="4" fill="#d8d2c6" />
              <circle cx="875" cy="140" r="4" fill="#ddd8ce" />
              <circle cx="900" cy="140" r="4" fill="#e2dcd2" />
              <circle cx="925" cy="140" r="4" fill="#e5e0d5" />
              
              {/* Quebec - Row 2 */}
              <circle cx="750" cy="115" r="4" fill="#e5e0d5" />
              <circle cx="775" cy="115" r="4" fill="#e2dcd2" />
              <circle cx="800" cy="115" r="4" fill="#ddd8ce" />
              <circle cx="825" cy="115" r="4" fill="#d8d2c6" />
              <circle cx="850" cy="115" r="4" fill="#d5cfc2" />
              <circle cx="875" cy="115" r="4" fill="#d0c9bb" />
              <circle cx="900" cy="115" r="4" fill="#d5cfc2" />
              <circle cx="925" cy="115" r="4" fill="#d8d2c6" />
              <circle cx="950" cy="115" r="4" fill="#ddd8ce" />
              <circle cx="975" cy="115" r="4" fill="#e2dcd2" />
              <circle cx="1000" cy="115" r="4" fill="#e5e0d5" />
              
              {/* Quebec - Row 3 */}
              <circle cx="825" cy="90" r="4" fill="#e5e0d5" />
              <circle cx="850" cy="90" r="4" fill="#e2dcd2" />
              <circle cx="875" cy="90" r="4" fill="#ddd8ce" />
              <circle cx="900" cy="90" r="4" fill="#d8d2c6" />
              <circle cx="925" cy="90" r="4" fill="#d5cfc2" />
              <circle cx="950" cy="90" r="4" fill="#d0c9bb" />
              <circle cx="975" cy="90" r="4" fill="#d5cfc2" />
              <circle cx="1000" cy="90" r="4" fill="#d8d2c6" />
              <circle cx="1025" cy="90" r="4" fill="#ddd8ce" />
              <circle cx="1050" cy="90" r="4" fill="#e2dcd2" />
              <circle cx="1075" cy="90" r="4" fill="#e5e0d5" />
              
              {/* Quebec - Row 4 */}
              <circle cx="900" cy="65" r="4" fill="#e5e0d5" />
              <circle cx="925" cy="65" r="4" fill="#e2dcd2" />
              <circle cx="950" cy="65" r="4" fill="#ddd8ce" />
              <circle cx="975" cy="65" r="4" fill="#d8d2c6" />
              <circle cx="1000" cy="65" r="4" fill="#d5cfc2" />
              <circle cx="1025" cy="65" r="4" fill="#d8d2c6" />
              <circle cx="1050" cy="65" r="4" fill="#ddd8ce" />
              <circle cx="1075" cy="65" r="4" fill="#e2dcd2" />
              <circle cx="1100" cy="65" r="4" fill="#e5e0d5" />
              
              {/* Quebec - Row 5 */}
              <circle cx="975" cy="40" r="4" fill="#e5e0d5" />
              <circle cx="1000" cy="40" r="4" fill="#e2dcd2" />
              <circle cx="1025" cy="40" r="4" fill="#ddd8ce" />
              <circle cx="1050" cy="40" r="4" fill="#d8d2c6" />
              <circle cx="1075" cy="40" r="4" fill="#ddd8ce" />
              <circle cx="1100" cy="40" r="4" fill="#e2dcd2" />
              <circle cx="1125" cy="40" r="4" fill="#e5e0d5" />
              
              {/* City markers */}
              {SERVICE_CITIES.map((city) => (
                <CityMarker
                  key={city.id}
                  city={city}
                  active={activeId === city.id}
                  onEnter={() => setActiveId(city.id)}
                  onLeave={() => setActiveId(null)}
                />
              ))}
            </svg>
            
            {/* Active city info card */}
            {activeId && (() => {
              const city = SERVICE_CITIES.find((c) => c.id === activeId);
              if (!city) return null;
              return (
                <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20">
                  <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 min-w-[200px]">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${city.hub ? 'bg-[#C9A063]' : 'bg-[#8B7355]'}`}>
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-gray-900 font-semibold">{city.name}</p>
                        <p className="text-gray-500 text-sm">
                          {city.province === "ON" ? "Ontario" : city.province === "QC" ? "Quebec" : "ON / NY"}
                        </p>
                      </div>
                    </div>
                    {city.hub && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C9A063]/10 text-[#8B7355] text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A063]" />
                          Primary Service Hub
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Places We Go Frequently Section */}
        <div className="relative py-8 sm:py-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {[
              { from: "Toronto", to: "Ottawa", distance: "448.9 km", time: "4h 30m", image: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=800&q=80" },
              { from: "Toronto", to: "Montreal", distance: "541.3 km", time: "5h 30m", image: "https://images.unsplash.com/photo-1519178614-68673b201f36?w=800&q=80" },
              { from: "Toronto", to: "Quebec City", distance: "802.3 km", time: "7h 55m", image: "https://images.unsplash.com/photo-1542704792-e30dac463c90?w=800&q=80" },
              { from: "Toronto", to: "Windsor", distance: "368.4 km", time: "4h", image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80" },
              { from: "Toronto", to: "New York", distance: "790 km", time: "8-9h", image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80" },
            ].map((route, index) => (
              <Link
                key={index}
                href="/reservation"
                className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={route.image}
                    alt={`${route.from} to ${route.to}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <h3 className="text-gray-900 text-xs sm:text-sm font-semibold mb-0.5 truncate">
                    {route.from} <span className="text-[#C9A063]">→</span> {route.to}
                  </h3>
                  <p className="text-gray-500 text-[11px] sm:text-xs mb-1.5">
                    {route.distance} | {route.time}
                  </p>
                  <span className="inline-flex items-center text-[#8B7355] text-[11px] sm:text-xs font-medium group-hover:text-[#C9A063] transition-colors">
                    Book Ride
                    <svg className="w-3 h-3 ml-0.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Fleet Technology Section */}
        <div className="relative pt-12 border-t border-gray-100">
          <h3 className="text-center text-gray-800 text-lg font-light tracking-[0.15em] uppercase mb-8">
            Fleet <span className="text-[#C9A063]">Technology</span>
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Wifi, title: "In-Vehicle WiFi", desc: "Check your emails/browse the internet while traveling to your destination. Ask your Chauffeur for more details." },
              { icon: MapPin, title: "GPS Tracking", desc: "Real-time fleet visibility and safety monitoring for peace of mind." },
              { icon: Clock, title: "24/7 Dispatch", desc: "Round-the-clock Online reservation support" },
              { icon: Shield, title: "Certified & Insured", desc: "Fully licensed and professionally trained chauffeurs." },
            ].map(({ icon: Icon, title, desc }) => (
              <div 
                key={title} 
                className="group p-5 rounded-xl bg-white border border-gray-100 hover:border-[#C9A063]/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[#C9A063]/15 to-[#8B7355]/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-5 h-5 text-[#C9A063]" strokeWidth={1.5} />
                </div>
                <h4 className="text-gray-800 text-sm font-semibold mb-1.5">{title}</h4>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default GlobalFootprint;
