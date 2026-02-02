"use client";

import {
  MapPin,
  Wifi,
  Mail,
  Shield,
  Globe,
  Smartphone,
  Video,
  Car,
  Handshake,
  UserCheck,
} from "lucide-react";

const features = [
  {
    icon: MapPin,
    text: "GPS integration allows seamless tracking, reservation, and billing processes",
  },
  {
    icon: Wifi,
    text: "Secure WiFi hotspot in every vehicle through our corporate-owned locations",
  },
  {
    icon: Mail,
    text: "SMS and Email notifications to notify guests of chauffeur's on-location status and contact information",
  },
  {
    icon: Shield,
    text: "Military-grade encryption and firewalls for our customers' personal and financial information",
  },
  {
    icon: Globe,
    text: "Our Global Affiliate Network extends your memorable chauffeured experience worldwide",
  },
  {
    icon: Smartphone,
    text: "Chauffeurs receive real-time updates through smartphones. Itinerary change? We react immediately",
  },
  {
    icon: Shield,
    text: "Your Safety and privacy is our top priority",
  },
  {
    icon: Car,
    text: "Each vehicle in our late-model, luxury fleet is meticulously maintained and pulled from service after 24 months",
  },
  {
    icon: Handshake,
    text: "Partnerships with leaders in the hospitality, airline & private aviation industries",
  },
  {
    icon: UserCheck,
    text: "Meet & Greet & Luggage Assistance: A dedicated agent meets you at the gate (arrivals), curb (departures) point with displayed name and assist you with your bags.",
  },
];

export default function LuxuryLifestyle() {
  return (
    <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-gray-900 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 uppercase">
            The SARJ Culture
          </h2>
          <p className="text-gray-600 text-[15px] sm:text-[16px] max-w-2xl mx-auto leading-relaxed font-light">
            Every detail of your experience is personalized before you even step into one of our vehicles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {features.map(({ icon: Icon, text }, index) => (
            <div
              key={index}
              className="group flex items-start gap-4 p-5 sm:p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:shadow-[#C9A063]/10 hover:border-[#C9A063]/30 transition-all duration-300"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#f2f2f7] flex items-center justify-center group-hover:bg-[#C9A063]/10 transition-colors duration-300">
                <Icon className="w-6 h-6 text-[#C9A063]" strokeWidth={1.5} />
              </div>
              <p className="text-gray-700 text-[14px] sm:text-[15px] leading-relaxed pt-1">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
