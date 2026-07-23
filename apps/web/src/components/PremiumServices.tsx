"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { services } from "@/data/services";

export default function PremiumServices() {
  // Take the first 6 services to display on the homepage
  const displayedServices = services.slice(0, 6);

  return (
    <section className="pt-12 md:pt-16 pb-6 md:pb-8 bg-gray-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#C9A063]/20 to-transparent" />

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#C9A063]/30 bg-[#C9A063]/5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A063]"></div>
            <span className="text-[#C9A063] text-xs sm:text-sm font-semibold tracking-widest uppercase">
              Our Premium Services
            </span>
          </div>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-light">
            Experience unparalleled comfort, punctuality, and professionalism with our comprehensive range of chauffeur services designed for every occasion.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {displayedServices.map((service) => {
            // Dynamically get the icon component from lucide-react
            const IconComponent = LucideIcons[service.icon as keyof typeof LucideIcons] as React.ElementType;

            const serviceImages: Record<string, string> = {
              "airport-transfers": "/heropics/airport2.png",
              "corporate-travel": "/corporate-section-1.jpg",
              "point-to-point-transfers": "/p2p-section-1.jpg",
              "hourly-chauffeur": "/hourly-section-1.jpg",
              "wedding-events": "/wedding-section-1.jpg",
              "meet-greet": "/meetgreet-section-1.jpg",
            };
            const imageUrl = serviceImages[service.slug] || "/cities.jpeg";

            return (
              <div
                key={service.slug}
                className="group rounded-xl shadow-sm hover:shadow-lg transition-all duration-500 relative flex flex-col h-[280px] sm:h-[300px] overflow-hidden cursor-pointer"
              >
                {/* Full Card Image Background */}
                <div className="absolute inset-0 z-0">
                  <img
                    src={imageUrl}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* Heavy gradient overlay to ensure text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 group-hover:from-black/95 group-hover:via-black/50 transition-colors duration-500" />
                </div>

                {/* Content Section (Positioned at bottom) */}
                <div className="relative z-10 flex flex-col justify-end h-full p-4 sm:p-5">
                  {/* Icon floating above title */}
                  <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-3 border border-white/20 group-hover:bg-[#C9A063]/20 group-hover:border-[#C9A063]/40 transition-all duration-300">
                    {IconComponent && (
                      <IconComponent className="w-4 h-4 text-[#C9A063]" strokeWidth={1.5} />
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 group-hover:text-[#C9A063] transition-colors duration-300">
                    {service.title}
                  </h3>

                  <p className="text-gray-300 text-xs sm:text-[13px] leading-relaxed mb-3 font-light line-clamp-2">
                    {service.shortDesc}
                  </p>

                  <Link
                    href={`/services/${service.slug}`}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#C9A063] uppercase tracking-wider hover:text-white transition-colors w-fit"
                  >
                    Learn More
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" strokeWidth={2} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center mt-12 sm:mt-16">
          <Link
            href="/services"
            className="group inline-flex items-center gap-2 px-8 py-4 text-[14px] font-medium rounded-xl transition-all duration-500 bg-gray-900 text-white hover:bg-[#C9A063] shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            View All Services
            <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </section>
  );
}
