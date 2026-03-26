"use client";

import { useState } from "react";
import Link from "next/link";
import { Wifi, MapPin } from "lucide-react";

// Service locations spread across world map for visual impact
const canadaCities = [
  { id: 1, name: "Toronto Pearson Airport", province: "Ontario", x: 8, y: 22, delay: "0s" },      // Alaska region
  { id: 2, name: "Hamilton Airport", province: "Ontario", x: 18, y: 35, delay: "0.4s" },          // USA West
  { id: 3, name: "London Airport", province: "Ontario", x: 24, y: 38, delay: "0.8s" },            // USA East / Canada
  { id: 4, name: "Ottawa Airport", province: "Ontario", x: 20, y: 55, delay: "1.2s" },            // South America
  { id: 5, name: "Montreal", province: "Quebec", x: 50, y: 32, delay: "1.6s" },                   // Europe
  { id: 6, name: "Niagara/Buffalo", province: "Ontario/NY", x: 55, y: 55, delay: "2s" },          // Africa
  { id: 7, name: "Ottawa/Montreal", province: "ON/QC", x: 78, y: 45, delay: "2.4s" },             // Asia
  { id: 8, name: "Greater Toronto Area", province: "Ontario", x: 85, y: 78, delay: "2.8s" },      // Australia
];

// City Marker Component with enterprise blinking effect
const CityMarker = ({ 
  city, 
  isActive, 
  onHover, 
  onLeave 
}: { 
  city: typeof canadaCities[0]; 
  isActive: boolean;
  onHover: () => void;
  onLeave: () => void;
}) => {
  return (
    <div
      className="absolute group cursor-pointer z-20"
      style={{ left: `${city.x}%`, top: `${city.y}%` }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Outer expanding ring - main blinking effect */}
      <div className="absolute -inset-4 sm:-inset-5">
        <div 
          className="w-full h-full rounded-full border border-[#8B7355]/40 animate-ping"
          style={{ animationDuration: "2.5s", animationDelay: city.delay }}
        />
      </div>
      
      {/* Secondary pulse ring */}
      <div className="absolute -inset-3 sm:-inset-4">
        <div 
          className="w-full h-full rounded-full bg-[#C9A063]/15 animate-pulse"
          style={{ animationDuration: "1.5s", animationDelay: city.delay }}
        />
      </div>
      
      {/* Inner glow ring */}
      <div 
        className="absolute -inset-2 sm:-inset-2.5 rounded-full bg-gradient-to-r from-[#C9A063]/25 to-[#8B7355]/25 animate-pulse"
        style={{ animationDelay: city.delay }}
      />
      
      {/* Diamond marker */}
      <div 
        className={`relative w-2.5 h-2.5 sm:w-3 sm:h-3 rotate-45 border transition-all duration-300 ${
          isActive 
            ? "bg-[#8B7355] border-[#C9A063] scale-150 shadow-[0_0_15px_rgba(139,115,85,0.6)]" 
            : "bg-[#C9A063] border-[#8B7355] hover:scale-125"
        }`}
      />

      {/* City label - shows on hover or when active */}
      <div 
        className={`absolute left-5 sm:left-7 top-1/2 -translate-y-1/2 whitespace-nowrap transition-all duration-300 ${
          isActive 
            ? "opacity-100 translate-x-0" 
            : "opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-2">
          {/* Connector line */}
          <div className="w-3 sm:w-5 h-px bg-gradient-to-r from-[#8B7355] to-[#C9A063]/40" />
          
          {/* Label card */}
          <div className="bg-white/95 backdrop-blur-md border border-[#C9A063]/50 px-3 py-1.5 sm:py-2 rounded shadow-lg shadow-[#8B7355]/10">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-1 h-1 bg-[#8B7355] rotate-45" />
              <span className="text-[#1a1a1a] text-xs sm:text-sm font-semibold tracking-wide">{city.name}</span>
            </div>
            <span className="text-[#8B7355] text-[9px] sm:text-[10px] tracking-[0.12em] uppercase font-medium">{city.province}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const GlobalFootprint = () => {
  const [activeCity, setActiveCity] = useState<number | null>(null);

  return (
    <section className="relative py-10 sm:py-12 md:py-14 lg:py-16 bg-white overflow-hidden">
      {/* Enterprise gradient overlays */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#C9A063]/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#C9A063]/30 to-transparent" />
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-[#C9A063]/[0.03] rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-[#8B7355]/[0.03] rounded-full blur-[80px]" />
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Enterprise Header */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          {/* Premium badge */}
          <div className="inline-flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-white border border-gray-200 shadow-sm mb-6 sm:mb-8">
            <div className="w-2.5 h-2.5 rounded-full bg-[#C9A063]" />
            <span className="text-[#1a1a1a] text-xs sm:text-sm font-bold tracking-[0.2em] uppercase">Cities We Serve</span>
          </div>
          
                    <p className="text-gray-500 text-base sm:text-lg tracking-wide font-light max-w-3xl mx-auto leading-relaxed">
            There&apos;s a reason for our elevated reputation worldwide. Experience luxury chauffeur services across major cities globally.
          </p>

          {/* CTA Button */}
          <div className="mt-6 sm:mt-8 flex justify-center">
            <Link
              href="/cities-we-serve"
              className="relative block w-full max-w-xl py-3 sm:py-3.5 rounded-lg overflow-hidden text-center
                bg-gradient-to-b from-[#9A8059] via-[#8B7355] to-[#6B5644]
                hover:from-[#8B7355] hover:via-[#7A6549] hover:to-[#5C4A3A]
                active:scale-[0.98]
                text-white text-[12px] sm:text-[13px] font-semibold tracking-[0.12em] uppercase underline underline-offset-4 decoration-1
                transition-all duration-300 ease-out
                shadow-[0_4px_16px_rgba(139,115,85,0.3)]
                hover:shadow-[0_6px_24px_rgba(139,115,85,0.45)]
                group"
            >
              <span className="relative">Services Available In All Cities</span>
            </Link>
          </div>
        </div>

        {/* World Map Container */}
        <div className="relative w-full aspect-[2/1] max-h-[650px] mx-auto mb-10 sm:mb-14">
          {/* Dotted World Map SVG */}
          <svg
            viewBox="0 0 1000 500"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Subtle shadow filter for dots */}
              <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* North America - darker dots for white bg */}
            <g fill="rgba(30,30,30,0.25)" filter="url(#dotShadow)">
              {/* Alaska */}
              <circle cx="80" cy="120" r="1.5"/><circle cx="90" cy="115" r="1.5"/><circle cx="100" cy="118" r="1.5"/>
              <circle cx="85" cy="130" r="1.5"/><circle cx="95" cy="125" r="1.5"/><circle cx="105" cy="128" r="1.5"/>
              <circle cx="75" cy="140" r="1.5"/><circle cx="85" cy="135" r="1.5"/><circle cx="70" cy="125" r="1.5"/>
              
              {/* Canada */}
              <circle cx="120" cy="130" r="1.5"/><circle cx="130" cy="125" r="1.5"/><circle cx="140" cy="128" r="1.5"/>
              <circle cx="150" cy="122" r="1.5"/><circle cx="160" cy="125" r="1.5"/><circle cx="170" cy="120" r="1.5"/>
              <circle cx="180" cy="118" r="1.5"/><circle cx="190" cy="122" r="1.5"/><circle cx="200" cy="125" r="1.5"/>
              <circle cx="210" cy="120" r="1.5"/><circle cx="220" cy="118" r="1.5"/><circle cx="230" cy="122" r="1.5"/>
              <circle cx="240" cy="125" r="1.5"/><circle cx="250" cy="128" r="1.5"/><circle cx="260" cy="130" r="1.5"/>
              
              <circle cx="125" cy="145" r="1.5"/><circle cx="135" cy="140" r="1.5"/><circle cx="145" cy="138" r="1.5"/>
              <circle cx="155" cy="142" r="1.5"/><circle cx="165" cy="140" r="1.5"/><circle cx="175" cy="135" r="1.5"/>
              <circle cx="185" cy="138" r="1.5"/><circle cx="195" cy="142" r="1.5"/><circle cx="205" cy="140" r="1.5"/>
              <circle cx="215" cy="138" r="1.5"/><circle cx="225" cy="140" r="1.5"/><circle cx="235" cy="145" r="1.5"/>
              <circle cx="245" cy="148" r="1.5"/><circle cx="255" cy="145" r="1.5"/>
              
              <circle cx="130" cy="160" r="1.5"/><circle cx="140" cy="155" r="1.5"/><circle cx="150" cy="158" r="1.5"/>
              <circle cx="160" cy="155" r="1.5"/><circle cx="170" cy="152" r="1.5"/><circle cx="180" cy="155" r="1.5"/>
              <circle cx="190" cy="158" r="1.5"/><circle cx="200" cy="155" r="1.5"/><circle cx="210" cy="152" r="1.5"/>
              <circle cx="220" cy="155" r="1.5"/><circle cx="230" cy="160" r="1.5"/><circle cx="240" cy="165" r="1.5"/>
              <circle cx="250" cy="162" r="1.5"/><circle cx="260" cy="158" r="1.5"/>
              
              {/* USA */}
              <circle cx="120" cy="175" r="1.5"/><circle cx="130" cy="178" r="1.5"/><circle cx="140" cy="175" r="1.5"/>
              <circle cx="150" cy="172" r="1.5"/><circle cx="160" cy="175" r="1.5"/><circle cx="170" cy="178" r="1.5"/>
              <circle cx="180" cy="175" r="1.5"/><circle cx="190" cy="172" r="1.5"/><circle cx="200" cy="175" r="1.5"/>
              <circle cx="210" cy="178" r="1.5"/><circle cx="220" cy="175" r="1.5"/><circle cx="230" cy="180" r="1.5"/>
              <circle cx="240" cy="182" r="1.5"/><circle cx="250" cy="178" r="1.5"/>
              
              <circle cx="125" cy="190" r="1.5"/><circle cx="135" cy="192" r="1.5"/><circle cx="145" cy="188" r="1.5"/>
              <circle cx="155" cy="185" r="1.5"/><circle cx="165" cy="188" r="1.5"/><circle cx="175" cy="192" r="1.5"/>
              <circle cx="185" cy="190" r="1.5"/><circle cx="195" cy="188" r="1.5"/><circle cx="205" cy="192" r="1.5"/>
              <circle cx="215" cy="195" r="1.5"/><circle cx="225" cy="192" r="1.5"/><circle cx="235" cy="195" r="1.5"/>
              <circle cx="245" cy="198" r="1.5"/>
              
              <circle cx="130" cy="205" r="1.5"/><circle cx="140" cy="208" r="1.5"/><circle cx="150" cy="205" r="1.5"/>
              <circle cx="160" cy="202" r="1.5"/><circle cx="170" cy="205" r="1.5"/><circle cx="180" cy="208" r="1.5"/>
              <circle cx="190" cy="205" r="1.5"/><circle cx="200" cy="210" r="1.5"/><circle cx="210" cy="212" r="1.5"/>
              <circle cx="220" cy="210" r="1.5"/><circle cx="230" cy="215" r="1.5"/>
              
              {/* Mexico & Central America */}
              <circle cx="140" cy="225" r="1.5"/><circle cx="150" cy="228" r="1.5"/><circle cx="160" cy="232" r="1.5"/>
              <circle cx="170" cy="235" r="1.5"/><circle cx="180" cy="238" r="1.5"/><circle cx="175" cy="250" r="1.5"/>
              <circle cx="185" cy="255" r="1.5"/><circle cx="190" cy="265" r="1.5"/><circle cx="195" cy="275" r="1.5"/>
            </g>
            
            {/* South America */}
            <g fill="rgba(30,30,30,0.2)" filter="url(#dotShadow)">
              <circle cx="220" cy="290" r="1.5"/><circle cx="230" cy="295" r="1.5"/><circle cx="240" cy="300" r="1.5"/>
              <circle cx="250" cy="305" r="1.5"/><circle cx="260" cy="298" r="1.5"/><circle cx="270" cy="295" r="1.5"/>
              <circle cx="225" cy="310" r="1.5"/><circle cx="235" cy="315" r="1.5"/><circle cx="245" cy="320" r="1.5"/>
              <circle cx="255" cy="318" r="1.5"/><circle cx="265" cy="312" r="1.5"/><circle cx="275" cy="305" r="1.5"/>
              <circle cx="230" cy="330" r="1.5"/><circle cx="240" cy="335" r="1.5"/><circle cx="250" cy="340" r="1.5"/>
              <circle cx="260" cy="335" r="1.5"/><circle cx="270" cy="328" r="1.5"/><circle cx="280" cy="320" r="1.5"/>
              <circle cx="235" cy="350" r="1.5"/><circle cx="245" cy="355" r="1.5"/><circle cx="255" cy="360" r="1.5"/>
              <circle cx="265" cy="355" r="1.5"/><circle cx="275" cy="345" r="1.5"/>
              <circle cx="240" cy="370" r="1.5"/><circle cx="250" cy="375" r="1.5"/><circle cx="260" cy="380" r="1.5"/>
              <circle cx="245" cy="390" r="1.5"/><circle cx="255" cy="395" r="1.5"/><circle cx="250" cy="410" r="1.5"/>
              <circle cx="245" cy="425" r="1.5"/><circle cx="240" cy="440" r="1.5"/>
            </g>
            
            {/* Europe */}
            <g fill="rgba(30,30,30,0.25)" filter="url(#dotShadow)">
              <circle cx="480" cy="130" r="1.5"/><circle cx="490" cy="125" r="1.5"/><circle cx="500" cy="128" r="1.5"/>
              <circle cx="510" cy="132" r="1.5"/><circle cx="520" cy="128" r="1.5"/><circle cx="530" cy="125" r="1.5"/>
              <circle cx="540" cy="130" r="1.5"/><circle cx="550" cy="135" r="1.5"/><circle cx="560" cy="132" r="1.5"/>
              <circle cx="485" cy="145" r="1.5"/><circle cx="495" cy="142" r="1.5"/><circle cx="505" cy="145" r="1.5"/>
              <circle cx="515" cy="148" r="1.5"/><circle cx="525" cy="145" r="1.5"/><circle cx="535" cy="142" r="1.5"/>
              <circle cx="545" cy="148" r="1.5"/><circle cx="555" cy="152" r="1.5"/>
              <circle cx="470" cy="160" r="1.5"/><circle cx="480" cy="158" r="1.5"/><circle cx="490" cy="162" r="1.5"/>
              <circle cx="500" cy="165" r="1.5"/><circle cx="510" cy="162" r="1.5"/><circle cx="520" cy="158" r="1.5"/>
              <circle cx="530" cy="162" r="1.5"/><circle cx="540" cy="168" r="1.5"/>
              <circle cx="475" cy="175" r="1.5"/><circle cx="485" cy="172" r="1.5"/><circle cx="495" cy="178" r="1.5"/>
              <circle cx="505" cy="182" r="1.5"/><circle cx="515" cy="178" r="1.5"/><circle cx="525" cy="175" r="1.5"/>
              <circle cx="535" cy="180" r="1.5"/>
            </g>
            
            {/* Africa */}
            <g fill="rgba(30,30,30,0.2)" filter="url(#dotShadow)">
              <circle cx="480" cy="220" r="1.5"/><circle cx="490" cy="225" r="1.5"/><circle cx="500" cy="228" r="1.5"/>
              <circle cx="510" cy="225" r="1.5"/><circle cx="520" cy="230" r="1.5"/><circle cx="530" cy="235" r="1.5"/>
              <circle cx="485" cy="245" r="1.5"/><circle cx="495" cy="250" r="1.5"/><circle cx="505" cy="248" r="1.5"/>
              <circle cx="515" cy="252" r="1.5"/><circle cx="525" cy="255" r="1.5"/><circle cx="535" cy="250" r="1.5"/>
              <circle cx="545" cy="245" r="1.5"/>
              <circle cx="490" cy="270" r="1.5"/><circle cx="500" cy="275" r="1.5"/><circle cx="510" cy="272" r="1.5"/>
              <circle cx="520" cy="278" r="1.5"/><circle cx="530" cy="275" r="1.5"/><circle cx="540" cy="268" r="1.5"/>
              <circle cx="495" cy="295" r="1.5"/><circle cx="505" cy="300" r="1.5"/><circle cx="515" cy="298" r="1.5"/>
              <circle cx="525" cy="302" r="1.5"/><circle cx="535" cy="295" r="1.5"/>
              <circle cx="500" cy="320" r="1.5"/><circle cx="510" cy="325" r="1.5"/><circle cx="520" cy="322" r="1.5"/>
              <circle cx="530" cy="318" r="1.5"/>
              <circle cx="505" cy="345" r="1.5"/><circle cx="515" cy="350" r="1.5"/><circle cx="525" cy="345" r="1.5"/>
              <circle cx="510" cy="365" r="1.5"/><circle cx="520" cy="368" r="1.5"/>
            </g>
            
            {/* Asia */}
            <g fill="rgba(30,30,30,0.25)" filter="url(#dotShadow)">
              {/* Russia */}
              <circle cx="580" cy="110" r="1.5"/><circle cx="600" cy="105" r="1.5"/><circle cx="620" cy="108" r="1.5"/>
              <circle cx="640" cy="105" r="1.5"/><circle cx="660" cy="110" r="1.5"/><circle cx="680" cy="108" r="1.5"/>
              <circle cx="700" cy="112" r="1.5"/><circle cx="720" cy="110" r="1.5"/><circle cx="740" cy="115" r="1.5"/>
              <circle cx="760" cy="112" r="1.5"/><circle cx="780" cy="118" r="1.5"/><circle cx="800" cy="115" r="1.5"/>
              <circle cx="820" cy="120" r="1.5"/><circle cx="840" cy="118" r="1.5"/><circle cx="860" cy="125" r="1.5"/>
              
              <circle cx="590" cy="130" r="1.5"/><circle cx="610" cy="128" r="1.5"/><circle cx="630" cy="132" r="1.5"/>
              <circle cx="650" cy="128" r="1.5"/><circle cx="670" cy="135" r="1.5"/><circle cx="690" cy="132" r="1.5"/>
              <circle cx="710" cy="138" r="1.5"/><circle cx="730" cy="135" r="1.5"/><circle cx="750" cy="140" r="1.5"/>
              <circle cx="770" cy="138" r="1.5"/><circle cx="790" cy="145" r="1.5"/><circle cx="810" cy="142" r="1.5"/>
              
              {/* Middle East & Central Asia */}
              <circle cx="560" cy="190" r="1.5"/><circle cx="575" cy="195" r="1.5"/><circle cx="590" cy="192" r="1.5"/>
              <circle cx="605" cy="198" r="1.5"/><circle cx="620" cy="195" r="1.5"/><circle cx="635" cy="200" r="1.5"/>
              <circle cx="565" cy="210" r="1.5"/><circle cx="580" cy="215" r="1.5"/><circle cx="595" cy="212" r="1.5"/>
              <circle cx="610" cy="218" r="1.5"/><circle cx="625" cy="215" r="1.5"/>
              
              {/* India */}
              <circle cx="650" cy="220" r="1.5"/><circle cx="665" cy="225" r="1.5"/><circle cx="680" cy="228" r="1.5"/>
              <circle cx="655" cy="245" r="1.5"/><circle cx="670" cy="250" r="1.5"/><circle cx="685" cy="248" r="1.5"/>
              <circle cx="660" cy="270" r="1.5"/><circle cx="675" cy="275" r="1.5"/><circle cx="690" cy="272" r="1.5"/>
              <circle cx="665" cy="290" r="1.5"/><circle cx="680" cy="295" r="1.5"/>
              
              {/* China & East Asia */}
              <circle cx="720" cy="170" r="1.5"/><circle cx="740" cy="175" r="1.5"/><circle cx="760" cy="172" r="1.5"/>
              <circle cx="780" cy="178" r="1.5"/><circle cx="800" cy="175" r="1.5"/><circle cx="820" cy="180" r="1.5"/>
              <circle cx="725" cy="195" r="1.5"/><circle cx="745" cy="200" r="1.5"/><circle cx="765" cy="198" r="1.5"/>
              <circle cx="785" cy="205" r="1.5"/><circle cx="805" cy="202" r="1.5"/><circle cx="825" cy="195" r="1.5"/>
              <circle cx="730" cy="220" r="1.5"/><circle cx="750" cy="225" r="1.5"/><circle cx="770" cy="222" r="1.5"/>
              <circle cx="790" cy="228" r="1.5"/><circle cx="810" cy="220" r="1.5"/>
              
              {/* Japan */}
              <circle cx="850" cy="175" r="1.5"/><circle cx="860" cy="180" r="1.5"/><circle cx="855" cy="195" r="1.5"/>
              <circle cx="865" cy="190" r="1.5"/><circle cx="870" cy="205" r="1.5"/>
              
              {/* Southeast Asia */}
              <circle cx="720" cy="260" r="1.5"/><circle cx="735" cy="265" r="1.5"/><circle cx="750" cy="268" r="1.5"/>
              <circle cx="765" cy="272" r="1.5"/><circle cx="780" cy="275" r="1.5"/>
              <circle cx="725" cy="285" r="1.5"/><circle cx="740" cy="290" r="1.5"/><circle cx="755" cy="295" r="1.5"/>
              <circle cx="770" cy="298" r="1.5"/>
              <circle cx="750" cy="315" r="1.5"/><circle cx="765" cy="320" r="1.5"/><circle cx="780" cy="325" r="1.5"/>
            </g>
            
            {/* Australia */}
            <g fill="rgba(30,30,30,0.2)" filter="url(#dotShadow)">
              <circle cx="800" cy="360" r="1.5"/><circle cx="815" cy="355" r="1.5"/><circle cx="830" cy="358" r="1.5"/>
              <circle cx="845" cy="355" r="1.5"/><circle cx="860" cy="360" r="1.5"/><circle cx="875" cy="365" r="1.5"/>
              <circle cx="805" cy="380" r="1.5"/><circle cx="820" cy="375" r="1.5"/><circle cx="835" cy="378" r="1.5"/>
              <circle cx="850" cy="375" r="1.5"/><circle cx="865" cy="380" r="1.5"/><circle cx="880" cy="385" r="1.5"/>
              <circle cx="810" cy="400" r="1.5"/><circle cx="825" cy="395" r="1.5"/><circle cx="840" cy="398" r="1.5"/>
              <circle cx="855" cy="395" r="1.5"/><circle cx="870" cy="400" r="1.5"/><circle cx="885" cy="405" r="1.5"/>
              <circle cx="820" cy="420" r="1.5"/><circle cx="835" cy="415" r="1.5"/><circle cx="850" cy="418" r="1.5"/>
              <circle cx="865" cy="415" r="1.5"/><circle cx="880" cy="420" r="1.5"/>
              <circle cx="840" cy="435" r="1.5"/><circle cx="855" cy="432" r="1.5"/><circle cx="870" cy="435" r="1.5"/>
              
              {/* New Zealand */}
              <circle cx="920" cy="420" r="1.5"/><circle cx="925" cy="435" r="1.5"/><circle cx="930" cy="450" r="1.5"/>
            </g>
          </svg>
          
          {/* City Markers overlay */}
          {canadaCities.map((city) => (
            <CityMarker
              key={city.id}
              city={city}
              isActive={activeCity === city.id}
              onHover={() => setActiveCity(city.id)}
              onLeave={() => setActiveCity(null)}
            />
          ))}
          
                  </div>

        
        {/* Technology Section */}
        <div className="max-w-[1100px] mx-auto pt-8 sm:pt-10 border-t border-gray-100">
          <div className="text-center mb-8 sm:mb-10">
            <h3 className="text-[#1a1a1a] text-xl sm:text-2xl md:text-3xl font-light tracking-[0.2em] uppercase mb-3">
              SARJ Worldwide Technology
            </h3>
            <div className="w-14 h-[2px] bg-gradient-to-r from-[#C9A063] to-[#8B7355] mx-auto" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {/* WIFI */}
            <div className="flex flex-col items-center text-center p-6 sm:p-8 rounded-lg bg-gradient-to-b from-gray-50/80 to-white border border-gray-100 shadow-sm hover:shadow-md hover:border-[#C9A063]/30 transition-all duration-300 group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gradient-to-br from-[#C9A063]/15 to-[#8B7355]/10 border border-[#C9A063]/20 flex items-center justify-center mb-4 sm:mb-5 group-hover:border-[#C9A063]/40 group-hover:shadow-sm transition-all duration-300">
                <Wifi className="w-8 h-8 sm:w-10 sm:h-10 text-[#8B7355]" strokeWidth={1.5} />
              </div>
              <h4 className="text-[#8B7355] text-sm sm:text-base font-semibold tracking-[0.12em] uppercase mb-2">
                Wifi
              </h4>
              <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto font-light">
                Enjoy WIFI in our vehicles to check your emails/browse internet while traveling to your destination. Ask your chauffeur for more info.
              </p>
            </div>
            
            {/* Vehicle Tracking */}
            <div className="flex flex-col items-center text-center p-6 sm:p-8 rounded-lg bg-gradient-to-b from-gray-50/80 to-white border border-gray-100 shadow-sm hover:shadow-md hover:border-[#C9A063]/30 transition-all duration-300 group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gradient-to-br from-[#C9A063]/15 to-[#8B7355]/10 border border-[#C9A063]/20 flex items-center justify-center mb-4 sm:mb-5 group-hover:border-[#C9A063]/40 group-hover:shadow-sm transition-all duration-300">
                <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-[#8B7355]" strokeWidth={1.5} />
              </div>
              <h4 className="text-[#8B7355] text-sm sm:text-base font-semibold tracking-[0.12em] uppercase mb-2">
                Vehicle Tracking
              </h4>
              <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto font-light">
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
