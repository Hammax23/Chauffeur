"use client";
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Users, Briefcase, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface FleetVehicle {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  seating: string;
  luggage: string;
  category: string;
}

const OurFleet = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [fleetData, setFleetData] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch fleet data from API
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

  const checkScrollButtons = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  const handlePrev = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -420, behavior: 'smooth' });
      setTimeout(checkScrollButtons, 400);
    }
  }, [checkScrollButtons]);

  const handleNext = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 420, behavior: 'smooth' });
      setTimeout(checkScrollButtons, 400);
    }
  }, [checkScrollButtons]);

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [checkScrollButtons]);

  // Helper to extract number from seating string like "3-4" or "6"
  const getPassengers = (seating: string) => {
    const match = seating.match(/\d+/);
    return match ? parseInt(match[0]) : 4;
  };

  const getLuggage = (luggage: string) => {
    const match = luggage.match(/\d+/);
    return match ? parseInt(match[0]) : 2;
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-[1600px] mx-auto px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">Our Fleet</h2>
          <button className="flex items-center gap-1 text-gray-900 font-medium text-sm hover:gap-2 transition-all duration-300">
            More Fleet
            <ArrowUpRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Fleet Cards Container - Connected Design */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : fleetData.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No fleet vehicles available</div>
        ) : (
        <div className="relative">
          {/* Left Red Curved Border */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 via-red-500 to-red-400 rounded-full z-10"></div>
          
          {/* Scrollable Cards Container */}
          <div 
            ref={scrollRef}
            onScroll={checkScrollButtons}
            className="overflow-x-auto scrollbar-hide ml-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Connected Cards Container with shared border */}
            <div className="inline-flex border border-gray-300 rounded-lg bg-white">
              {fleetData.map((vehicle, index) => (
                <div
                  key={vehicle.id || index}
                  className={`flex-shrink-0 w-[420px] bg-white transition-all duration-300 hover:bg-gray-50/80 ${
                    index !== fleetData.length - 1 ? 'border-r border-gray-300' : ''
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-6 pb-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{vehicle.name}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed min-h-[40px]">
                      {vehicle.description}
                    </p>
                  </div>

                  {/* Vehicle Image */}
                  <div className="px-6 pb-4">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-md overflow-hidden aspect-[4/3]">
                      <img
                        src={vehicle.imageUrl}
                        alt={vehicle.name}
                        className="w-full h-full object-cover mix-blend-multiply"
                      />
                    </div>
                  </div>

                  {/* Card Footer - Passengers & Luggage */}
                  <div className="px-6 pb-6 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-800" strokeWidth={2.5} />
                        <span className="text-sm font-normal text-gray-900">Passengers {getPassengers(vehicle.seating)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-gray-800" strokeWidth={2.5} />
                        <span className="text-sm font-normal text-gray-900">Luggage {getLuggage(vehicle.luggage)}</span>
                      </div>
                    </div>
                    <Link href="/reservation" className="relative flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all group overflow-hidden">
                      <span className="absolute inset-0 shimmer-effect"></span>
                      <span className="relative z-10">Book Now</span>
                      <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform relative z-10" strokeWidth={2.5} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

        {/* Navigation Arrows */}
        <div className="flex items-center gap-3 mt-10">
          <button
            onClick={handlePrev}
            disabled={!canScrollLeft}
            className={`w-11 h-11 rounded-full border border-gray-300 flex items-center justify-center transition-all duration-300 ${
              canScrollLeft 
                ? 'hover:bg-gray-100 hover:border-gray-400 active:scale-95' 
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
          </button>
          <button
            onClick={handleNext}
            disabled={!canScrollRight}
            className={`w-11 h-11 rounded-full border border-gray-300 flex items-center justify-center transition-all duration-300 ${
              canScrollRight 
                ? 'hover:bg-gray-100 hover:border-gray-400 active:scale-95' 
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .shimmer-effect {
          background: linear-gradient(
            120deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0) 40%,
            rgba(255, 255, 255, 0.1) 45%,
            rgba(255, 255, 255, 0.3) 48%,
            rgba(255, 255, 255, 0.6) 50%,
            rgba(255, 255, 255, 0.3) 52%,
            rgba(255, 255, 255, 0.1) 55%,
            rgba(255, 255, 255, 0) 60%,
            rgba(255, 255, 255, 0) 100%
          );
          background-size: 250% 100%;
          background-position: -250% 0;
          animation: singleShine 6s ease-in-out infinite;
          transform: skewX(-20deg);
        }
        
        @keyframes singleShine {
          0% {
            background-position: -250% 0;
          }
          25% {
            background-position: 150% 0;
          }
          100% {
            background-position: 150% 0;
          }
        }
      `}</style>
    </section>
  );
};

export default OurFleet;
