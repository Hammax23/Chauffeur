"use client";
import React, { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Users, Briefcase } from 'lucide-react';

const fleetData = [
  {
    category: "Sedan",
    name: "Cadillac XTS",
    image: "/fleet/xts1.png",
    passengers: 3,
    luggage: 2,
  },
  {
    category: "Sedan",
    name: "Cadillac Lyriq",
    image: "/fleet/lyricfront.png",
    passengers: 3,
    luggage: 2,
  },
  {
    category: "Executive",
    name: "Mercedes S-Class",
    image: "/fleet/mercedesS1.png",
    passengers: 3,
    luggage: 3,
  },
  {
    category: "SUV",
    name: "Chevrolet Suburban",
    image: "/fleet/suburban.png",
    passengers: 6,
    luggage: 5,
  },
  {
    category: "SUV",
    name: "Cadillac Escalade",
    image: "/fleet/escalade.png",
    passengers: 6,
    luggage: 5,
  },
  {
    category: "Van",
    name: "Sprinter Van",
    image: "/fleet/sprinter.png",
    passengers: 16,
    luggage: 16,
  },
];

const DiscoverFleet = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const checkScrollButtons = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
      
      // Calculate active index based on scroll position
      const cardWidth = 420;
      const newIndex = Math.round(scrollLeft / cardWidth);
      setActiveIndex(Math.min(newIndex, fleetData.length - 1));
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

  const scrollToIndex = useCallback((index: number) => {
    if (scrollRef.current) {
      const cardWidth = 420;
      scrollRef.current.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
      setTimeout(checkScrollButtons, 400);
    }
  }, [checkScrollButtons]);

  useEffect(() => {
    checkScrollButtons();
    const container = scrollRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
    }
    window.addEventListener('resize', checkScrollButtons);
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScrollButtons);
      }
      window.removeEventListener('resize', checkScrollButtons);
    };
  }, [checkScrollButtons]);

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-white overflow-hidden">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-gray-800 text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 tracking-tight">
            DISCOVER YOUR FLEET
          </h2>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg font-light tracking-wide">
            FROM THOSE WHO LIVE AND BREATHE LUXURY
          </p>
        </div>

        {/* Fleet Cards Container with Side Arrows */}
        <div className="relative">
          {/* Left Arrow Button */}
          <button
            onClick={handlePrev}
            disabled={!canScrollLeft}
            aria-label="Previous"
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center transition-all duration-300 ${
              canScrollLeft
                ? 'hover:bg-gray-50 hover:shadow-xl hover:scale-105 active:scale-95'
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" strokeWidth={2} />
          </button>

          {/* Right Arrow Button */}
          <button
            onClick={handleNext}
            disabled={!canScrollRight}
            aria-label="Next"
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center transition-all duration-300 ${
              canScrollRight
                ? 'hover:bg-gray-50 hover:shadow-xl hover:scale-105 active:scale-95'
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-6 h-6 text-gray-700" strokeWidth={2} />
          </button>

          {/* Scrollable Cards Container */}
          <div
            ref={scrollRef}
            className="overflow-x-auto scrollbar-hide mx-14"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex gap-4 sm:gap-5 md:gap-6 px-2">
              {fleetData.map((vehicle, index) => (
                <Link
                  key={index}
                  href="/reservation"
                  className="flex-shrink-0 w-[calc(100vw-120px)] sm:w-[calc(50vw-80px)] md:w-[calc(33.333vw-60px)] lg:w-[360px] xl:w-[400px] bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-[#C9A063]/40 transition-all duration-300 overflow-hidden group cursor-pointer"
                >
                  {/* Card Header */}
                  <div className="p-5 pb-3">
                    <span className="text-gray-900 text-lg sm:text-xl font-bold block mb-1">
                      {vehicle.category}
                    </span>
                    <span className="text-gray-600 text-sm font-medium">
                      {vehicle.name}
                    </span>
                  </div>

                  {/* Vehicle Image */}
                  <div className="px-5 pb-4">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg overflow-hidden h-[160px] sm:h-[180px] flex items-center justify-center">
                      <img
                        src={vehicle.image}
                        alt={vehicle.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Card Footer - Passengers & Luggage */}
                  <div className="px-5 pb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#C9A063]" strokeWidth={2} />
                      <span className="text-sm text-gray-700">{vehicle.passengers} Passengers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[#C9A063]" strokeWidth={2} />
                      <span className="text-sm text-gray-700">{vehicle.luggage} Luggages</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Dot Indicators + View All Link */}
        <div className="flex flex-col items-center gap-6 mt-8 sm:mt-10">
          {/* Dot Indicators */}
          <div className="flex items-center gap-2">
            {fleetData.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToIndex(index)}
                aria-label={`Go to slide ${index + 1}`}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? 'bg-[#C9A063] scale-110'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          {/* Discover More Button */}
          <Link
            href="/fleet"
            className="group inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 text-[13px] sm:text-[14px] md:text-[15px] font-medium rounded-xl transition-all duration-500 bg-gradient-to-r from-[#8B7355] to-[#6B5644] text-white hover:from-[#6B5644] hover:to-[#8B7355] shadow-[0_8px_30px_rgba(139,115,85,0.4)] hover:shadow-[0_12px_40px_rgba(139,115,85,0.5)] hover:scale-105 backdrop-blur-sm border border-[#8B7355]/30"
          >
            DISCOVER MORE
            <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};

export default DiscoverFleet;
