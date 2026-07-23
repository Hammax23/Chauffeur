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

const GAP = 20;
const AUTO_MS = 4000;

const DiscoverFleet = () => {
  const [fleetData, setFleetData] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [paused, setPaused] = useState(false);
  const [activeDot, setActiveDot] = useState(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; scrollLeft: number; dragging: boolean; moved: boolean }>({
    startX: 0,
    scrollLeft: 0,
    dragging: false,
    moved: false,
  });

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

  const getStep = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return 300;
    const card = el.querySelector<HTMLElement>("[data-fleet-card]");
    if (!card) return 300;
    return card.offsetWidth + GAP;
  }, []);

  const syncControls = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < maxScroll - 4);
    const step = getStep();
    setActiveDot(step > 0 ? Math.round(el.scrollLeft / step) : 0);
  }, [getStep]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || fleetData.length === 0) return;

    syncControls();
    el.addEventListener("scroll", syncControls, { passive: true });
    const ro = new ResizeObserver(() => syncControls());
    ro.observe(el);
    // Recheck after images load (scrollWidth changes)
    const imgs = el.querySelectorAll("img");
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener("load", syncControls);
    });

    return () => {
      el.removeEventListener("scroll", syncControls);
      ro.disconnect();
      imgs.forEach((img) => img.removeEventListener("load", syncControls));
    };
  }, [fleetData, syncControls]);

  const scrollToIndex = useCallback(
    (i: number, behavior: ScrollBehavior = "smooth") => {
      const el = viewportRef.current;
      if (!el) return;
      const step = getStep();
      const maxScroll = el.scrollWidth - el.clientWidth;
      const next = Math.max(0, Math.min(i * step, maxScroll));
      el.scrollTo({ left: next, behavior });
    },
    [getStep]
  );

  const goNext = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const step = getStep();
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (el.scrollLeft >= maxScroll - 4) {
      el.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    el.scrollBy({ left: step, behavior: "smooth" });
  }, [getStep]);

  const goPrev = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const step = getStep();
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (el.scrollLeft <= 4) {
      el.scrollTo({ left: maxScroll, behavior: "smooth" });
      return;
    }
    el.scrollBy({ left: -step, behavior: "smooth" });
  }, [getStep]);

  // Autoplay
  useEffect(() => {
    if (paused || loading || fleetData.length < 2) return;
    const id = window.setInterval(goNext, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused, loading, fleetData.length, goNext]);

  // Pointer drag
  const onPointerDown = (e: React.PointerEvent) => {
    const el = viewportRef.current;
    if (!el) return;
    // Don't start drag from buttons
    if ((e.target as HTMLElement).closest("button")) return;
    dragRef.current = {
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      dragging: true,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
    setPaused(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = viewportRef.current;
    if (!el || !dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 6) dragRef.current.moved = true;
    el.scrollLeft = dragRef.current.scrollLeft - dx;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const el = viewportRef.current;
    if (!el) return;
    const wasDragging = dragRef.current.dragging;
    const moved = dragRef.current.moved;
    dragRef.current.dragging = false;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (wasDragging && moved) {
      const step = getStep();
      const i = Math.round(el.scrollLeft / step);
      scrollToIndex(i);
    }
    setPaused(false);
  };

  const onCardClick = (e: React.MouseEvent) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  };

  const dotCount = (() => {
    if (fleetData.length === 0) return 0;
    // Approx: one dot per scroll step
    const el = viewportRef.current;
    if (!el) return fleetData.length;
    const step = getStep();
    if (step <= 0) return fleetData.length;
    const maxScroll = el.scrollWidth - el.clientWidth;
    return Math.max(1, Math.round(maxScroll / step) + 1);
  })();

  if (loading) {
    return (
      <section className="pt-12 md:pt-16 pb-6 md:pb-8 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
          </div>
        </div>
      </section>
    );
  }

  if (fleetData.length === 0) return null;

  return (
    <section className="pt-12 md:pt-16 pb-6 md:pb-8 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
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
            className={`absolute left-0 top-[42%] z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full border bg-white/95 shadow-md flex items-center justify-center transition-all -translate-x-1 sm:-translate-x-3 -translate-y-1/2 ${
              canLeft
                ? "border-gray-200 text-gray-800 hover:border-[#C9A063] hover:text-[#C9A063]"
                : "border-gray-100 text-gray-300"
            }`}
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Next vehicles"
            onClick={goNext}
            className={`absolute right-0 top-[42%] z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full border bg-white/95 shadow-md flex items-center justify-center transition-all translate-x-1 sm:translate-x-3 -translate-y-1/2 ${
              canRight
                ? "border-gray-200 text-gray-800 hover:border-[#C9A063] hover:text-[#C9A063]"
                : "border-gray-100 text-gray-300"
            }`}
          >
            <ChevronRight className="w-5 h-5" strokeWidth={2} />
          </button>

          <div
            ref={viewportRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 cursor-grab active:cursor-grabbing select-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x px-1"
          >
            {fleetData.map((vehicle) => (
              <Link
                key={vehicle.id}
                data-fleet-card
                href={`/reservation?vehicleId=${vehicle.id}`}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onClick={onCardClick}
                className="snap-start shrink-0 w-[78%] sm:w-[46%] md:w-[31%] lg:w-[23.5%] bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-[#C9A063]/50 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-shadow duration-300 group"
              >
                <div className="px-5 pt-5 pb-2">
                  <span className="text-gray-900 text-lg font-bold block leading-tight">
                    {vehicle.category}
                  </span>
                  <span className="text-gray-500 text-sm font-medium mt-0.5 block">
                    {vehicle.name}
                  </span>
                </div>

                <div className="px-4 pb-3 pointer-events-none">
                  <div className="h-[150px] sm:h-[160px] flex items-center justify-center bg-gradient-to-b from-gray-50 to-white rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={vehicle.imageUrl}
                      alt={vehicle.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                      draggable={false}
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

          {/* Dots only */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {Array.from({ length: Math.min(dotCount, 12) }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => scrollToIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === activeDot ? "w-6 bg-[#C9A063]" : "w-2 bg-gray-300 hover:bg-gray-400"
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
