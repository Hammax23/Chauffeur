"use client";

import Link from "next/link";
import { REGIONS } from "@/data/regions";

const CitiesWeServiceContent = () => {
  return (
    <section className="relative min-h-[calc(100vh-140px)] bg-white overflow-hidden">
      {/* Dotted graph style - fine dots */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at center, rgba(0,0,0,0.12) 1.5px, transparent 1.5px),
            radial-gradient(circle at center, rgba(0,0,0,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px, 12px 12px",
          backgroundPosition: "0 0, 6px 6px",
        }}
      />
      {/* Dotted graph - major dots (gold tint) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at center, rgba(139,115,85,0.2) 2px, transparent 2px)`,
          backgroundSize: "96px 96px",
        }}
      />

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 pt-12 sm:pt-16 md:pt-20 pb-16 md:pb-24">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14 md:mb-16">
          <h1 className="text-gray-900 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight uppercase mb-3 sm:mb-4">
            Cities We Service
          </h1>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg font-medium tracking-[0.15em] uppercase">
            Available in over{" "}
            <span className="text-[#C9A063] font-semibold">1000</span> cities
            worldwide
          </p>
        </div>

        {/* Region buttons grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {REGIONS.map((region) => (
            <Link
              key={region.slug}
              href={`/cities-we-serve/${region.slug}`}
              className="relative w-full py-4 sm:py-5 rounded-lg overflow-hidden text-center block
                bg-gradient-to-b from-[#5C4A3A] via-[#4F3C2C] to-[#3D3025]
                hover:from-[#6B5644] hover:via-[#5C4A3A] hover:to-[#4F3C2C]
                active:scale-[0.98]
                text-white text-[13px] sm:text-[14px] font-semibold tracking-[0.08em] uppercase
                transition-all duration-300 ease-out
                border border-white/10 border-t-white/20
                shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_4px_12px_rgba(0,0,0,0.4)]
                hover:shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset,0_6px_20px_rgba(0,0,0,0.35),0_0_0_1px_rgba(201,160,99,0.2)]"
            >
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" aria-hidden />
              <span className="relative">{region.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CitiesWeServiceContent;
