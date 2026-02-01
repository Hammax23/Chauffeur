"use client";
import { useState } from 'react';
import { ChevronRight, Users, Briefcase } from 'lucide-react';

const fleetData = [
  { name: 'CHEVROLET SUBURBAN', image: '/fleet/suburban.png', seating: '6 maximum, 5 comfortable', luggage: '4 large, 2 medium' },
  { name: 'CADILLAC XTS', image: '/fleet/xts.png', seating: '4 maximum, 3 comfortable', luggage: '2 large, 2 medium' },
  { name: 'CADILLAC LYRIQ', image: '/fleet/lyric.png', seating: '4 maximum, 4 comfortable', luggage: '2 large, 2 medium' },
  { name: 'CADILLAC ESCALADE', image: '/fleet/escalade.png', seating: '6 maximum, 5 comfortable', luggage: '4 large, 2 medium' },
  { name: 'MERCEDES S-CLASS ', image: '/fleet/mercedesS1.png', seating: '4 maximum, 3 comfortable', luggage: '2 large, 2 medium' },
  { name: 'SPRINTER VAN', image: '/fleet/sprinter.png', seating: '8 maximum, 7 comfortable', luggage: '6 large, 4 medium' },
];

const DiscoverFleet = () => {
  const [activeTab, setActiveTab] = useState(fleetData[0].name);

  const activeCar = fleetData.find(car => car.name === activeTab);

  return (
    <section className="py-16 sm:py-20 md:py-24 lg:py-28 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 md:px-12">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-gray-800 text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 tracking-tight">
            DISCOVER YOUR FLEET
          </h2>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg font-light tracking-wide">
            FROM THOSE WHO LIVE AND BREATHE LUXURY
          </p>
        </div>

        {/* Car buttons (left) + Car Image (right) */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-stretch mb-8 sm:mb-12">
          {/* Car name buttons - LEFT side */}
          <div className="flex flex-wrap md:flex-col justify-center md:justify-start gap-2 sm:gap-4 order-2 md:order-1 w-full md:w-auto md:min-w-[200px]">
            {fleetData.map((car) => (
              <button
                key={car.name}
                onClick={() => setActiveTab(car.name)}
                className={`px-6 sm:px-8 py-3 sm:py-3.5 text-[13px] sm:text-[14px] md:text-[15px] font-medium rounded-xl transition-all duration-500 backdrop-blur-sm border ${
                  activeTab === car.name
                    ? 'bg-gradient-to-r from-[#8B7355] to-[#6B5644] text-white shadow-[0_8px_30px_rgba(139,115,85,0.4)] border-[#8B7355]/30 scale-105'
                    : 'bg-white/80 text-gray-700 hover:bg-white hover:text-[#8B7355] hover:border-[#8B7355]/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] border-gray-200'
                }`}
              >
                {car.name}
              </button>
            ))}
          </div>
          {/* Car image - RIGHT side */}
          <div className="flex-1 relative group order-1 md:order-2 w-full">
            <div className="aspect-[16/9] sm:aspect-[21/9] relative">
              <img
                src={activeCar?.image}
                alt={activeTab}
                className="w-full h-full object-contain transition-all duration-700 group-hover:scale-105 drop-shadow-2xl"
              />
            </div>
            {/* Seating & Luggage Capacity - responsive: centered on mobile, left shift on desktop */}
            <div className="mt-4 md:mt-2 flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3 sm:gap-6 translate-x-0 md:-translate-x-40">
              <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-gray-50/90 border border-gray-100 shadow-sm w-full sm:w-auto max-w-[280px] sm:max-w-none">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#8B7355]" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <span className="text-[#8B7355] text-[12px] sm:text-[14px] font-semibold block">Seating Capacity</span>
                  <span className="text-gray-900 text-[13px] sm:text-[15px] font-medium">{activeCar?.seating}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-gray-50/90 border border-gray-100 shadow-sm w-full sm:w-auto max-w-[280px] sm:max-w-none">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-[#8B7355]" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <span className="text-[#8B7355] text-[12px] sm:text-[14px] font-semibold block">Luggage Capacity</span>
                  <span className="text-gray-900 text-[13px] sm:text-[15px] font-medium">{activeCar?.luggage}</span>
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
