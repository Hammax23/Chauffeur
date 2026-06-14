"use client";

import { useState } from "react";
import Link from "next/link";
import { Wifi, MapPin, Clock, Shield } from "lucide-react";
import { SERVICE_CITIES, type ServiceCity } from "@/data/service-cities";
import {
  MAP_VIEWBOX,
  projectCanada,
  ONTARIO_PATHS,
  QUEBEC_PATHS,
  LAKE_ERIE,
  LAKE_ONTARIO,
  LAKE_HURON,
} from "@/lib/canada-map-projection";

/** Label position per city — tuned to real map layout */
const LABEL_OFFSET: Record<string, { dx: number; dy: number; anchor?: "start" | "middle" | "end" }> = {
  windsor: { dx: 0, dy: 14, anchor: "middle" },
  london: { dx: -40, dy: 12, anchor: "end" },
  kitchener: { dx: -44, dy: -2, anchor: "end" },
  hamilton: { dx: -38, dy: 10, anchor: "end" },
  niagara: { dx: 42, dy: 6, anchor: "start" },
  oakville: { dx: -46, dy: -10, anchor: "end" },
  mississauga: { dx: 42, dy: -6, anchor: "start" },
  toronto: { dx: 0, dy: 14, anchor: "middle" },
  markham: { dx: 34, dy: -8, anchor: "start" },
  barrie: { dx: 0, dy: -12, anchor: "middle" },
  kingston: { dx: 38, dy: 4, anchor: "start" },
  ottawa: { dx: 0, dy: -12, anchor: "middle" },
  montreal: { dx: -32, dy: 14, anchor: "end" },
  laval: { dx: 30, dy: -10, anchor: "start" },
  "quebec-city": { dx: -52, dy: 4, anchor: "end" },
  burlington: { dx: -40, dy: 12, anchor: "end" },
};

function labelAnchor(off: { dx: number; anchor?: "start" | "middle" | "end" }) {
  if (off.anchor) return off.anchor;
  if (off.dx < -10) return "end";
  if (off.dx > 10) return "start";
  return "middle";
}

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
  const { x, y } = projectCanada(city.lng, city.lat);
  const isHub = city.hub;
  const off = LABEL_OFFSET[city.id] ?? { dx: 0, dy: 12, anchor: "middle" as const };
  const r = isHub ? 5 : 3.8;
  const lx = x + off.dx;
  const ly = y + off.dy;
  const anchor = labelAnchor(off);
  const label = city.name;
  const fontSize = isHub ? 8 : label.length > 14 ? 6.5 : 7.2;
  const labelW = label.length * (fontSize * 0.52);
  const rectX = anchor === "end" ? lx - labelW : anchor === "start" ? lx : lx - labelW / 2;

  const g = (
    <g onMouseEnter={onEnter} onMouseLeave={onLeave} style={{ pointerEvents: "all", cursor: "pointer" }}>
      {(active || isHub) && (
        <circle cx={x} cy={y} r={isHub ? 11 : 8} fill={isHub ? "rgba(139,115,85,0.12)" : "rgba(201,160,99,0.1)"} />
      )}
      <circle cx={x} cy={y} r={r + 1.5} fill="#fff" opacity={0.95} />
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={isHub ? "#8B7355" : active ? "#C9A063" : "#b8956a"}
        stroke="#fff"
        strokeWidth={1.4}
      />
      <g pointerEvents="none">
        <rect
          x={rectX - 3}
          y={ly - fontSize - 1}
          width={labelW + 6}
          height={fontSize + 5}
          rx={2.5}
          fill="rgba(255,255,255,0.92)"
          stroke="rgba(203,213,225,0.8)"
          strokeWidth={0.5}
        />
        <text
          x={lx}
          y={ly}
          textAnchor={anchor}
          fill={isHub ? "#1e293b" : "#475569"}
          fontSize={fontSize}
          fontWeight={isHub ? 600 : 500}
          fontFamily="system-ui,sans-serif"
        >
          {label}
        </text>
      </g>
    </g>
  );

  if (city.slug) return <a href={`/cities-we-serve/${city.slug}`}>{g}</a>;
  return g;
}

const GlobalFootprint = () => {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <section className="relative py-12 sm:py-16 md:py-20 bg-[#fafafa]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
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

        <div className="mb-8">
          <div
            className="relative w-full"
            style={{ aspectRatio: `${MAP_VIEWBOX.width} / ${MAP_VIEWBOX.height}` }}
          >
            <svg
              viewBox={`${MAP_VIEWBOX.x} ${MAP_VIEWBOX.y} ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
              className="absolute inset-0 w-full h-full block"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Map of SARJ service cities in Ontario and Quebec"
            >
              <defs>
                <linearGradient id="waterFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#c5d8e8" />
                  <stop offset="100%" stopColor="#b0c9dc" />
                </linearGradient>
                <linearGradient id="landFill" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f3f0ea" />
                  <stop offset="100%" stopColor="#ebe6de" />
                </linearGradient>
              </defs>

              <g>
                {/* Water / background */}
                <rect
                  x={MAP_VIEWBOX.x}
                  y={MAP_VIEWBOX.y}
                  width={MAP_VIEWBOX.width}
                  height={MAP_VIEWBOX.height}
                  fill="url(#waterFill)"
                />

                {/* Land masses */}
                {ONTARIO_PATHS.map((d, i) => (
                  <path key={`on-${i}`} d={d} fill="url(#landFill)" stroke="#9aa8b4" strokeWidth={0.8} strokeLinejoin="round" />
                ))}
                {QUEBEC_PATHS.map((d, i) => (
                  <path key={`qc-${i}`} d={d} fill="url(#landFill)" stroke="#9aa8b4" strokeWidth={0.8} strokeLinejoin="round" />
                ))}

                {/* Great Lakes */}
                <path d={LAKE_HURON} fill="#8eb8d4" fillOpacity={0.55} stroke="#7aa3be" strokeWidth={0.5} />
                <path d={LAKE_ERIE} fill="#8eb8d4" fillOpacity={0.6} stroke="#7aa3be" strokeWidth={0.5} />
                <path d={LAKE_ONTARIO} fill="#8eb8d4" fillOpacity={0.58} stroke="#7aa3be" strokeWidth={0.5} />

                {/* Province divider emphasis along shared border */}
                {QUEBEC_PATHS.map((d, i) => (
                  <path key={`qc-line-${i}`} d={d} fill="none" stroke="#8a96a3" strokeWidth={1.1} strokeLinejoin="round" />
                ))}
                {ONTARIO_PATHS.map((d, i) => (
                  <path key={`on-line-${i}`} d={d} fill="none" stroke="#8a96a3" strokeWidth={1.1} strokeLinejoin="round" />
                ))}

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
              </g>
            </svg>

            {activeId && (() => {
              const city = SERVICE_CITIES.find((c) => c.id === activeId);
              if (!city) return null;
              return (
                <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:w-64">
                  <div className="bg-white border border-slate-200 rounded-lg shadow-md px-4 py-3">
                    <p className="text-slate-900 font-medium text-sm">{city.name}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {city.province === "ON" ? "Ontario" : city.province === "QC" ? "Quebec" : "Ontario / New York"}
                      {city.hub ? " · Primary hub" : ""}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="px-2 sm:px-4 py-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {SERVICE_CITIES.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onMouseEnter={() => setActiveId(city.id)}
                  onMouseLeave={() => setActiveId(null)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                    activeId === city.id
                      ? "bg-white text-slate-800 shadow-sm"
                      : "bg-transparent text-slate-500 hover:text-slate-700 hover:bg-white/60"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${city.hub ? "bg-[#8B7355]" : "bg-[#C9A063]"}`} />
                  {city.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-[1000px] mx-auto pt-8 border-t border-slate-200">
          <h3 className="text-center text-slate-800 text-lg font-light tracking-[0.15em] uppercase mb-6">
            Fleet Technology
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Wifi, title: "In-Vehicle WiFi", desc: "Check your emails/browse the internet while traveling to your destination. Ask your Chauffeur for more details." },
              { icon: MapPin, title: "GPS Tracking", desc: "Real-time fleet visibility and safety." },
              { icon: Clock, title: "24/7 Dispatch", desc: "Round-the-clock Online reservation support" },
              { icon: Shield, title: "Certified & Insured", desc: "Fully licensed professional chauffeurs." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-5 rounded-lg bg-white border border-slate-100">
                <Icon className="w-5 h-5 text-[#8B7355] mb-2" strokeWidth={1.5} />
                <h4 className="text-slate-800 text-xs font-semibold tracking-wide uppercase mb-1">{title}</h4>
                <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default GlobalFootprint;
