"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Enter Trip Details",
    description:
      "Provide your pickup location, destination, and travel preferences to begin your premium reservation.",
  },
  {
    number: "02",
    title: "Select Luxury Vehicle",
    description:
      "Choose from our executive sedans, SUVs, sprinters, and premium chauffeur fleet options.",
  },
  {
    number: "03",
    title: "Schedule Your Ride",
    description:
      "Select your preferred date and time with flexible 24/7 luxury transportation availability.",
  },
  {
    number: "04",
    title: "Confirm Booking",
    description:
      "Receive instant confirmation, chauffeur details, and ride updates for a stress-free experience.",
  },
];

export default function BookingProcess() {
  return (
    <section className="relative py-12 md:py-16 bg-[#0a0a0a] overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 right-0 w-[420px] h-[420px] -translate-y-1/2 translate-x-1/3 rounded-full bg-[#C9A063]/[0.07] blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] rounded-full bg-[#C9A063]/[0.04] blur-[80px]" />
      </div>

      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 md:px-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-7">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-[#C9A063]/60" />
            <span className="text-[#C9A063] text-[10px] sm:text-[11px] font-semibold tracking-[0.22em] uppercase">
              Booking Process
            </span>
            <div className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-[#C9A063]/60" />
          </div>

          <h2 className="text-white text-xl sm:text-2xl md:text-[28px] font-bold tracking-tight mb-2.5">
            How To Reserve Your Ride
          </h2>

          <p className="text-gray-400 text-[13px] sm:text-[14px] leading-snug max-w-xl mx-auto font-light">
            Booking your private chauffeur with SARJ Worldwide takes just minutes. Share your trip details, choose between distance-based or hourly service, and select the vehicle that best fits your journey. Once confirmed, you’ll receive your chauffeur’s details and real-time ride updates, ensuring everything is prepared before you even step outside.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line — desktop */}
          <div
            className="hidden lg:block absolute top-[22px] left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-[#C9A063]/20 via-[#C9A063]/50 to-[#C9A063]/20"
            aria-hidden
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="group relative rounded-xl border border-white/[0.08] bg-[#141414]/90 backdrop-blur-sm px-4 py-4 sm:px-5 sm:py-5 hover:border-[#C9A063]/30 hover:bg-[#181818] transition-all duration-300"
              >
                <div className="relative mb-3.5">
                  <div className="relative z-10 w-11 h-11 rounded-full bg-gradient-to-br from-[#C9A063] to-[#B8935A] flex items-center justify-center shadow-md shadow-[#C9A063]/25 group-hover:shadow-[#C9A063]/40 group-hover:scale-105 transition-all duration-300">
                    <span className="text-black text-[13px] font-bold tracking-tight">{step.number}</span>
                  </div>
                  <div className="absolute inset-0 w-11 h-11 rounded-full bg-[#C9A063]/20 blur-lg opacity-50 group-hover:opacity-80 transition-opacity" />
                </div>

                <h3 className="text-white text-[15px] font-bold mb-2 tracking-tight">
                  {step.title}
                </h3>

                <p className="text-gray-400 text-[12px] sm:text-[13px] leading-[1.55] font-light">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex justify-center mt-6 sm:mt-7">
          <Link
            href="/reservation"
            className="group inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3 rounded-full bg-gradient-to-r from-[#C9A063] to-[#B8935A] text-white font-semibold text-[13px] sm:text-[14px] shadow-md shadow-[#C9A063]/20 hover:shadow-lg hover:shadow-[#C9A063]/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            Start Your Reservation
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </section>
  );
}
