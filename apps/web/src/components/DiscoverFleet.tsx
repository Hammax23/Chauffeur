"use client";
import React from "react";
import Link from "next/link";
import { ChevronRight, Users, Briefcase } from "lucide-react";
import { fleetData } from "@/data/fleet";

function parsePassengers(seating: string): number {
  const match = seating.match(/(\d+)\s+maximum/i);
  return match ? parseInt(match[1], 10) : 3;
}

function parseLuggage(luggage: string): number {
  const large = luggage.match(/(\d+)\s+large/i);
  if (large) return parseInt(large[1], 10);
  const pieces = luggage.match(/(\d+)\s+pieces?/i);
  if (pieces) return parseInt(pieces[1], 10);
  return 2;
}

const DiscoverFleet = () => {
  return (
    <section className="py-12 sm:py-16 md:py-20 bg-white">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 md:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-gray-800 text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 tracking-tight">
            DISCOVER YOUR FLEET
          </h2>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg font-light tracking-wide">
            FROM THOSE WHO LIVE AND BREATHE LUXURY
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6">
          {fleetData.map((vehicle) => (
            <Link
              key={vehicle.id}
              href={`/reservation?vehicleId=${vehicle.id}`}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-[#C9A063]/40 transition-all duration-300 overflow-hidden group cursor-pointer"
            >
              <div className="p-5 pb-3">
                <span className="text-gray-900 text-lg sm:text-xl font-bold block mb-1">
                  {vehicle.category}
                </span>
                <span className="text-gray-600 text-sm font-medium">
                  {vehicle.name}
                </span>
              </div>

              <div className="px-5 pb-4">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg overflow-hidden h-[160px] sm:h-[180px] flex items-center justify-center">
                  <img
                    src={vehicle.image}
                    alt={vehicle.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>

              <div className="px-5 pb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#C9A063]" strokeWidth={2} />
                  <span className="text-sm text-gray-700">
                    {parsePassengers(vehicle.seating)} Passengers
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#C9A063]" strokeWidth={2} />
                  <span className="text-sm text-gray-700">
                    {parseLuggage(vehicle.luggage)} Luggages
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex justify-center mt-8 sm:mt-10">
          <Link
            href="/fleet"
            className="group inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 text-[13px] sm:text-[14px] md:text-[15px] font-medium rounded-xl transition-all duration-500 bg-gradient-to-r from-[#8B7355] to-[#6B5644] text-white hover:from-[#6B5644] hover:to-[#8B7355] shadow-[0_8px_30px_rgba(139,115,85,0.4)] hover:shadow-[0_12px_40px_rgba(139,115,85,0.5)] hover:scale-105 backdrop-blur-sm border border-[#8B7355]/30"
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
