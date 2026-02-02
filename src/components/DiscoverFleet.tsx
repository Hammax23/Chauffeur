"use client";
import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Users, Briefcase } from 'lucide-react';

const fleetData = [
  { name: 'CADILLAC XTS', images: ['/fleet/xts.png', '/fleet/xts.png', '/fleet/xts.png'], seating: '4 maximum, 3 comfortable', luggage: '2 large, 2 medium' },
  { name: 'CADILLAC LYRIQ', images: ['/fleet/lyric.png', '/fleet/lyric.png', '/fleet/lyric.png'], seating: '4 maximum, 4 comfortable', luggage: '2 large, 2 medium' },
  { name: 'MERCEDES S-CLASS ', images: ['/fleet/mercedesS1.png', '/fleet/mercedesS1.png', '/fleet/mercedesS1.png'], seating: '4 maximum, 3 comfortable', luggage: '2 large, 2 medium' },
  { name: 'CHEVROLET SUBURBAN', images: ['/fleet/suburban.png', '/fleet/suburban.png', '/fleet/suburban.png'], seating: '6 maximum, 5 comfortable', luggage: '4 large, 2 medium' },
  { name: 'CADILLAC ESCALADE', images: ['/fleet/escalade.png', '/fleet/escalade.png', '/fleet/escalade.png'], seating: '6 maximum, 5 comfortable', luggage: '4 large, 2 medium' },
  { name: 'SPRINTER VAN', images: ['/fleet/sprinter.png', '/fleet/sprinter.png', '/fleet/sprinter.png'], seating: '8 maximum, 7 comfortable', luggage: '6 large, 4 medium' },
];

const DiscoverFleet = () => {
  const [activeTab, setActiveTab] = useState(fleetData[0].name);
  const [imageIndex, setImageIndex] = useState(0);

  const activeCar = fleetData.find(car => car.name === activeTab);
  const images = activeCar?.images ?? [];
  const currentImage = images[imageIndex] ?? images[0];

  useEffect(() => {
    setImageIndex(0);
  }, [activeTab]);

  const goPrev = () => {
    setImageIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
  };
  const goNext = () => {
    setImageIndex((i) => (i >= images.length - 1 ? 0 : i + 1));
  };

  return (
    <section className="py-10 sm:py-12 md:py-14 lg:py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 md:px-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-gray-800 text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 tracking-tight">
            DISCOVER YOUR FLEET
          </h2>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg font-light tracking-wide">
            FROM THOSE WHO LIVE AND BREATHE LUXURY
          </p>
        </div>

        {/* Car buttons (left) + Car Image (right) */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-4 lg:gap-5 items-center md:items-stretch mb-6 sm:mb-8">
          {/* Car name buttons - LEFT side */}
          <div className="flex flex-wrap md:flex-col justify-center md:justify-start gap-2 sm:gap-3 order-2 md:order-1 w-full md:w-[190px] lg:w-[200px]">
            {fleetData.map((car) => (
              <button
                key={car.name}
                onClick={() => setActiveTab(car.name)}
                className={`w-full md:w-full min-w-0 px-5 py-2.5 text-[12px] sm:text-[13px] font-medium rounded-lg transition-all duration-300 text-center border ${
                  activeTab === car.name
                    ? 'bg-gradient-to-r from-[#8B7355] to-[#6B5644] text-white shadow-md border-[#8B7355]/40'
                    : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-[#8B7355] hover:border-[#8B7355]/40 border-gray-200'
                }`}
              >
                {car.name}
              </button>
            ))}
          </div>
          {/* Car image - RIGHT side with left/right arrows */}
          <div className="flex-1 relative group order-1 md:order-2 w-full max-w-[680px] lg:max-w-[750px] md:ml-12 lg:ml-20">
            <div className="w-full h-[260px] sm:h-[300px] md:h-[320px] relative overflow-hidden rounded-lg bg-gray-50/50">
              <img
                key={`${activeTab}-${imageIndex}`}
                src={currentImage}
                alt={`${activeTab} - view ${imageIndex + 1}`}
                className="w-full h-full object-contain object-center transition-all duration-500 group-hover:scale-[1.02] drop-shadow-xl"
              />
              {/* Left arrow */}
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous image"
                  className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 hover:bg-white shadow-lg border border-gray-200/80 flex items-center justify-center text-gray-700 hover:text-[#8B7355] transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                </button>
              )}
              {/* Right arrow */}
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next image"
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 hover:bg-white shadow-lg border border-gray-200/80 flex items-center justify-center text-gray-700 hover:text-[#8B7355] transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                </button>
              )}
              {/* Dot indicators */}
              {images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setImageIndex(i)}
                      aria-label={`Go to image ${i + 1}`}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${i === imageIndex ? 'bg-[#8B7355] scale-110' : 'bg-white/80 hover:bg-white/90'}`}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* Seating & Luggage Capacity - responsive: centered on mobile, left shift on desktop */}
            <div className="mt-4 md:mt-2 flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3 sm:gap-5 translate-x-0 md:-translate-x-24">
              <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg bg-gray-50/90 border border-gray-100 shadow-sm w-full sm:w-auto max-w-[220px] sm:max-w-none">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8B7355]" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <span className="text-[#8B7355] text-[11px] sm:text-[12px] font-semibold block">Seating Capacity</span>
                  <span className="text-gray-900 text-[12px] sm:text-[13px] font-medium">{activeCar?.seating}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg bg-gray-50/90 border border-gray-100 shadow-sm w-full sm:w-auto max-w-[220px] sm:max-w-none">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8B7355]" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <span className="text-[#8B7355] text-[11px] sm:text-[12px] font-semibold block">Luggage Capacity</span>
                  <span className="text-gray-900 text-[12px] sm:text-[13px] font-medium">{activeCar?.luggage}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Discover More - neeche center */}
        <div className="flex justify-center">
          <button className="group flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 text-[13px] sm:text-[14px] md:text-[15px] font-medium rounded-xl transition-all duration-500 bg-gradient-to-r from-[#8B7355] to-[#6B5644] text-white hover:from-[#6B5644] hover:to-[#8B7355] shadow-[0_8px_30px_rgba(139,115,85,0.4)] hover:shadow-[0_12px_40px_rgba(139,115,85,0.5)] hover:scale-105 backdrop-blur-sm border border-[#8B7355]/30">
            DISCOVER MORE
            <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default DiscoverFleet;
