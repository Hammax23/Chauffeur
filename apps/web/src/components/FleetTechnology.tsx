"use client";

import { Wifi, MapPin, Clock, Shield } from "lucide-react";

const FleetTechnology = () => {
  return (
    <section className="bg-white pt-8 sm:pt-10 pb-12 sm:pb-16">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <h3 className="text-center text-gray-800 text-lg font-light tracking-[0.15em] uppercase mb-8">
          Fleet <span className="text-[#C9A063]">Technology</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Wifi, title: "In-Vehicle WiFi", desc: "Check your emails/browse the internet while traveling to your destination. Ask your Chauffeur for more details." },
            { icon: MapPin, title: "GPS Tracking", desc: "Real-time fleet visibility and safety monitoring for peace of mind." },
            { icon: Clock, title: "24/7 Dispatch", desc: "Round-the-clock Online reservation support" },
            { icon: Shield, title: "Certified & Insured", desc: "Fully licensed and professionally trained chauffeurs." },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group p-5 rounded-xl bg-white border border-gray-100 hover:border-[#C9A063]/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[#C9A063]/15 to-[#8B7355]/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-5 h-5 text-[#C9A063]" strokeWidth={1.5} />
              </div>
              <h4 className="text-gray-800 text-sm font-semibold mb-1.5">{title}</h4>
              <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FleetTechnology;
