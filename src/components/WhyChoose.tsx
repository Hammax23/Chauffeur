"use client";

import Link from "next/link";
import { ShieldCheck, Headphones, Clock, Calendar } from "lucide-react";

const WhyChoose = () => {
  const features = [
    {
      icon: Clock,
      title: 'On-Time',
      description: 'We guarantee punctual service and professional time management for every ride.',
    },
    {
      icon: ShieldCheck,
      title: 'Safety & Privacy',
      description: 'Professional chauffeurs ensure your safety and complete privacy throughout your journey.',
    },
    {
      icon: Calendar,
      title: 'Flexible Bookings',
      description: 'Flexible booking options that adapt to your schedule and changing needs.',
    },
    {
      icon: Headphones,
      title: 'Customer Service',
      description: '24/7 support available whenever you need assistance, day or night.',
    },
  ];

  return (
    <section className="py-10 sm:py-12 md:py-14 lg:py-16 bg-[#0a0a0a] relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 md:px-12 relative z-10">
        {/* Header Section */}
        <div className="mb-10 sm:mb-12 md:mb-14">
          <div className="flex justify-center mb-4 sm:mb-5">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/30">
              <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
              <span className="text-white text-[12px] sm:text-[13px] font-normal tracking-widest uppercase">WHY CHOOSE US</span>
            </div>
          </div>
          
          <h5 className="text-gray-400 text-[20px] sm:text-[22px] md:text-[24px] font-normal leading-relaxed text-center max-w-4xl mx-auto">
            SARJ Worldwide owned vehicles, range from Sedans, SUVs, Sprinters and Limousines. All vehicle are equipped with cell phone chargers, WIFI, & bottled water.{" "}
            <Link
              href="/fleet"
              className="text-[#C9A063] underline underline-offset-4 decoration-2 hover:text-white hover:decoration-white transition-colors duration-200 font-medium ml-1"
            >
              Our Fleets
            </Link>
          </h5>
        </div>

        {/* Features Grid - 1 row x 4 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
            <div key={index} className="group">
              {/* Icon */}
              <div className="mb-6 text-white">
                <Icon className="w-10 h-10" strokeWidth={1.5} />
              </div>

              {/* Title */}
              <h3 className="text-white text-xl sm:text-2xl font-bold mb-3 leading-tight">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-gray-400 text-[14px] sm:text-[15px] leading-relaxed">
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
