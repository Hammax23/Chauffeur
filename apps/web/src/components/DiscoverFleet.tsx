"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Users, Briefcase } from "lucide-react";

interface FleetVehicle {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  seating: string;
  luggage: string;
}

function parsePassengers(seating: string): number {
  const match = seating.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 3;
}

function parseLuggage(luggage: string): number {
  const match = luggage.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 2;
}

const DiscoverFleet = () => {
  const [fleetData, setFleetData] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(300);
  const [visible, setVisible] = useState(1);
  const gap = 20;

  useEffect(() => {
    fetch("/api/fleet")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.vehicles) {
          setFleetData(data.vehicles);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const w = el.clientWidth;
    let nextVisible = 1;
    if (w >= 1100) nextVisible = 4;
    else if (w >= 820) nextVisible = 3;
    else if (w >= 520) nextVisible = 2;
    const nextWidth = Math.floor((w - gap * (nextVisible - 1)) / nextVisible);
    setVisible(nextVisible);
    setCardWidth(Math.max(220, nextWidth));
  }, []);

  useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [fleetData, measure]);

  const maxIndex = Math.max(0, fleetData.length - visible);

  const goNext = useCallback(() => {
    setIndex((i) => (i >= maxIndex ? 0 : i + 1));
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? maxIndex : i - 1));
  }, [maxIndex]);

  // Auto-play carousel
  useEffect(() => {
    if (paused || fleetData.length <= visible) return;
    const id = window.setInterval(goNext, 3500);
    return () => window.clearInterval(id);
  }, [paused, fleetData.length, visible, goNext]);

  // Keep index in range if data / viewport changes
  useEffect(() => {
    if (index > maxIndex) setIndex(maxIndex);
  }, [index, maxIndex]);

  if (loading) {
    return (
      <section className="pt-12 md:pt-16 pb-6 md:pb-8 bg-white">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
          </div>
        </div>
      </section>
    );
  }

  if (fleetData.length === 0) {
    return null;
  }

  const offset = index * (cardWidth + gap);

  return (
    <section className="pt-12 md:pt-16 pb-6 md:pb-8 bg-white">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 md:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-gray-800 text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 tracking-tight">
            DISCOVER YOUR FLEET
          </h2>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg font-light tracking-wide max-w-4xl mx-auto">
            Choose the perfect vehicle for your airport transfer, corporate journey, wedding, or private travel. SARJ Worldwide&apos;s fleet includes luxury sedans, SUVs, sprinter vans, and limousines suited to different group sizes, luggage needs, and travel styles. Explore our luxury fleet and enjoy a comfortable, door-to-door chauffeur experience across Canada.
          </p>
        </div>

        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <button
            type="button"
            aria-label="Previous vehicles"
            onClick={goPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 -translate-x-1 sm:-translate-x-3 w-11 h-11 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center text-gray-800 hover:border-[#C9A063] hover:text-[#C9A063] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Next vehicles"
            onClick={goNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 translate-x-1 sm:translate-x-3 w-11 h-11 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center text-gray-800 hover:border-[#C9A063] hover:text-[#C9A063] transition-colors"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={2} />
          </button>

          <div ref={trackRef} className="overflow-hidden mx-2 sm:mx-4">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{
                gap: `${gap}px`,
                transform: `translateX(-${offset}px)`,
              }}
            >
              {fleetData.map((vehicle) => (
                <Link
                  key={vehicle.id}
                  href={`/reservation?vehicleId=${vehicle.id}`}
                  className="shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-[#C9A063]/50 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-300 group"
                  style={{ width: cardWidth }}
                >
                  <div className="px-5 pt-5 pb-2">
                    <span className="text-gray-900 text-lg font-bold block leading-tight">
                      {vehicle.category}
                    </span>
                    <span className="text-gray-500 text-sm font-medium mt-0.5 block">
                      {vehicle.name}
                    </span>
                  </div>

                  <div className="px-4 pb-3">
                    <div className="h-[150px] sm:h-[160px] flex items-center justify-center bg-gradient-to-b from-gray-50 to-white rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={vehicle.imageUrl}
                        alt={vehicle.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  <div className="px-5 pb-5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Users className="w-4 h-4 text-[#C9A063] shrink-0" strokeWidth={2} />
                      <span className="text-sm text-gray-700 truncate">
                        {parsePassengers(vehicle.seating)} Passengers
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Briefcase className="w-4 h-4 text-[#C9A063] shrink-0" strokeWidth={2} />
                      <span className="text-sm text-gray-700 truncate">
                        {parseLuggage(vehicle.luggage)} Luggages
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-2 mt-5">
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index ? "w-6 bg-[#C9A063]" : "w-2 bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-center mt-8 sm:mt-10">
          <Link
            href="/fleet"
            className="group inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 text-[13px] sm:text-[14px] md:text-[15px] font-medium rounded-xl transition-all duration-500 bg-gradient-to-r from-[#8B7355] to-[#6B5644] text-white hover:from-[#6B5644] hover:to-[#8B7355] shadow-[0_8px_30px_rgba(139,115,85,0.4)] hover:shadow-[0_12px_40px_rgba(139,115,85,0.5)] hover:scale-105 border border-[#8B7355]/30"
          >
            DISCOVER MORE
            <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default DiscoverFleet;
