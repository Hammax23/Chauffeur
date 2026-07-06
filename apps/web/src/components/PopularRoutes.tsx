"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock, Route } from "lucide-react";

const popularRoutes = [
  {
    from: "Toronto",
    to: "Ottawa",
    distance: "448.9 km",
    time: "4h 30m",
    image: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=800&q=80",
  },
  {
    from: "Toronto",
    to: "Montreal",
    distance: "541.3 km",
    time: "5h 30m",
    image: "https://images.unsplash.com/photo-1519178614-68673b201f36?w=800&q=80",
  },
  {
    from: "Toronto",
    to: "Quebec City",
    distance: "802.3 km",
    time: "7h 55m",
    image: "https://images.unsplash.com/photo-1542704792-e30dac463c90?w=800&q=80",
  },
  {
    from: "Toronto",
    to: "Windsor",
    distance: "368.4 km",
    time: "4h",
    image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80",
  },
  {
    from: "Toronto",
    to: "New York",
    distance: "790 km",
    time: "8–9h",
    image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80",
  },
];

export default function PopularRoutes() {
  return (
    <section className="relative pt-2 sm:pt-4 pb-10 sm:pb-12 md:pb-14 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight mb-2">
            Places We Go Frequently
          </h2>
          <p className="text-gray-500 text-sm sm:text-[15px] max-w-xl mx-auto leading-relaxed">
            Premium intercity chauffeur service from Toronto — comfortable, punctual, and professionally driven.
          </p>
        </div>

        {/* Route cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {popularRoutes.map((route) => (
            <Link
              key={`${route.from}-${route.to}`}
              href="/reservation"
              className="group relative flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:border-[#C9A063]/25 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#C9A063]/20 via-[#C9A063] to-[#C9A063]/20 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-10" />

              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={route.image}
                  alt={`Chauffeur service from ${route.from} to ${route.to}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                <div className="absolute bottom-2.5 left-2.5 right-2.5">
                  <p className="text-white text-[11px] sm:text-xs font-semibold leading-snug drop-shadow-sm">
                    {route.from}{" "}
                    <span className="text-[#C9A063] font-bold">→</span>{" "}
                    {route.to}
                  </p>
                </div>
              </div>

              <div className="flex flex-col flex-1 p-3 sm:p-3.5">
                <div className="flex items-center gap-3 mb-3 text-[10px] sm:text-[11px] text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Route className="w-3 h-3 text-[#C9A063]" strokeWidth={2} />
                    {route.distance}
                  </span>
                  <span className="w-px h-3 bg-gray-200" />
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#C9A063]" strokeWidth={2} />
                    {route.time}
                  </span>
                </div>

                <div className="mt-auto pt-2.5 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[#8B7355] text-[11px] sm:text-xs font-semibold group-hover:text-[#C9A063] transition-colors">
                    Book Ride
                  </span>
                  <span className="w-7 h-7 rounded-full bg-[#C9A063]/10 flex items-center justify-center group-hover:bg-[#C9A063] transition-colors duration-300">
                    <ArrowRight
                      className="w-3.5 h-3.5 text-[#C9A063] group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300"
                      strokeWidth={2.25}
                    />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
