"use client";

import Link from "next/link";
import { ShieldCheck, Headphones, Clock, Calendar, MapPin, Shield } from "lucide-react";

const WhyChoose = () => {
  const features = [
    {
      icon: Clock,
      title: "On-Time",
      description: "We guarantee punctual service and professional time management for every ride.",
    },
    {
      icon: ShieldCheck,
      title: "Safety & Privacy",
      description: "Professional chauffeurs ensure your safety and complete privacy throughout your journey.",
    },
    {
      icon: Calendar,
      title: "Flexible Bookings",
      description: "Flexible booking options that adapt to your schedule and changing needs.",
    },
    {
      icon: Headphones,
      title: "Customer Service",
      description: "24/7 support available whenever you need assistance, day or night.",
    },
    {
      icon: MapPin,
      title: "GPS Tracking",
      description: "Real-time fleet visibility and safety monitoring for peace of mind.",
    },
    {
      icon: Shield,
      title: "Certified & Insured",
      description: "Fully licensed and professionally trained chauffeurs.",
    },
  ];

  return (
    <section className="pt-6 md:pt-8 pb-12 md:pb-16 bg-[#fafafa] relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 md:px-12 relative z-10">
        {/* Header Section */}
        <div className="mb-6 sm:mb-7">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#C9A063]/30 bg-[#C9A063]/5 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C9A063]" />
              <span className="text-[#C9A063] text-xs sm:text-sm font-semibold tracking-widest uppercase">
                Why Choose Us
              </span>
            </div>
          </div>

          <h5 className="text-gray-600 text-[17px] sm:text-[19px] md:text-[20px] font-normal leading-snug text-center max-w-4xl mx-auto">
            Every SARJ Worldwide journey is designed around comfort, punctuality, privacy, and professional chauffeur service. Our experienced team ensures a smooth and reliable travel experience with attention to detail, from your initial pickup to your final drop-off.{" "}
            <Link
              href="/fleet"
              className="text-[#C9A063] underline underline-offset-4 decoration-2 hover:text-[#B8935A] transition-colors duration-200 font-medium ml-1"
            >
              Our Fleet
            </Link>
          </h5>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group flex flex-col bg-white border border-gray-100/90 rounded-2xl px-4 py-4 sm:px-5 sm:py-4 min-h-0 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.07)] hover:border-[#C9A063]/25 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-[#f8f4f0] flex items-center justify-center mb-3 group-hover:bg-[#f3ebe0] transition-colors duration-300">
                  <Icon className="w-[18px] h-[18px] text-[#C9A063]" strokeWidth={1.5} />
                </div>

                <h3 className="text-[#1a2b3c] text-[14px] sm:text-[15px] font-bold mb-1.5 leading-snug tracking-tight">
                  {feature.title}
                </h3>

                <p className="text-[#666666] text-[12px] sm:text-[13px] leading-[1.5]">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhyChoose;
