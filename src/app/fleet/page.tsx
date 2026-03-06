import Link from "next/link";
import Image from "next/image";
import { fleetData } from "@/data/fleet";
import { Users, Briefcase, ArrowRight } from "lucide-react";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

const BASE_URL = "https://luxride-chauffeur.vercel.app";

export const metadata: Metadata = {
  title: "Our Fleet",
  description:
    "SARJ Worldwide chauffeur fleet: Mercedes-Benz, BMW, Cadillac, Range Rover & more. Executive sedans, SUVs, premium vans for every chauffeur occasion.",
  keywords: ["SARJ Worldwide fleet", "chauffeur fleet", "Mercedes chauffeur", "Cadillac chauffeur", "executive chauffeur car", "premium chauffeur vehicles"],
  openGraph: {
    title: "Our Fleet | SARJ Worldwide Chauffeur Services",
    description: "Chauffeur fleet: Mercedes-Benz, BMW, Cadillac, Range Rover. Executive sedans, SUVs, premium vans.",
    url: `${BASE_URL}/fleet`,
    siteName: "SARJ Worldwide Chauffeur Services",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Our Fleet | SARJ Worldwide Chauffeur Services" },
  alternates: { canonical: `${BASE_URL}/fleet` },
};

export default function FleetPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <TopNav />
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-[160px] md:pt-[180px] pb-8 sm:pb-12 md:pb-16 bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(201,160,99,0.1)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_25%,rgba(255,255,255,0.02)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.02)_75%)] bg-[length:60px_60px]" />
        
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 md:px-12 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-[#C9A063]/30 shadow-lg mb-8">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#C9A063] to-[#B8935A] animate-pulse" />
            <span className="text-[#C9A063] text-[13px] sm:text-[14px] font-bold tracking-[0.2em] uppercase">
              Our Collection
            </span>
          </div>

          {/* Main Headlines */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
            Curated Luxury Vehicles
          </h1>

          {/* Description */}
          <p className="text-gray-300 text-sm sm:text-base md:text-lg max-w-4xl mx-auto leading-relaxed font-light mb-10">
            From executive sedans to premium SUVs and vans—each vehicle is maintained to the
            highest standards and ready to elevate your journey.
          </p>


          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Link
              href="/reservation"
              className="group inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-4 sm:py-5 rounded-full bg-gradient-to-r from-[#C9A063] to-[#B8935A] text-white font-semibold text-base sm:text-lg shadow-lg shadow-[#C9A063]/30 hover:shadow-xl hover:shadow-[#C9A063]/40 hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Reserve Your Ride
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-1/4 left-10 w-2 h-2 bg-[#C9A063] rounded-full animate-pulse opacity-60" />
        <div className="absolute top-1/3 right-16 w-1 h-1 bg-white rounded-full animate-pulse delay-300" />
        <div className="absolute bottom-1/4 left-1/4 w-1.5 h-1.5 bg-[#C9A063] rounded-full animate-pulse delay-700" />
      </section>

      {/* Fleet Gallery Section */}
      <section id="fleet-gallery" className="py-16 sm:py-20 md:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1300px] mx-auto px-6 sm:px-8 md:px-12">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {fleetData.map((vehicle) => (
              <article
                key={vehicle.id}
                className="group rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl hover:border-[#C9A063]/30 transition-all duration-300"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 flex items-center justify-center">
                  <Image
                    src={vehicle.image}
                    alt={vehicle.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#C9A063]/90 text-white text-[11px] sm:text-[12px] font-semibold tracking-wide uppercase backdrop-blur-sm">
                    {vehicle.category}
                  </span>
                </div>

                <div className="p-5 sm:p-6">
                  <h2 className="text-gray-900 font-bold text-lg sm:text-xl mb-2 tracking-tight group-hover:text-[#C9A063] transition-colors">
                    {vehicle.name}
                  </h2>
                  <p className="text-gray-600 text-[14px] sm:text-[15px] leading-relaxed font-light mb-4">
                    {vehicle.description}
                  </p>

                  <div className="space-y-3 text-gray-600 mb-4">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#C9A063]/10 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-[#C9A063]" strokeWidth={2} />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-[#8B7355] uppercase tracking-wide">Seating</span>
                        <p className="text-[13px] sm:text-[14px] font-medium text-gray-700">{vehicle.seating}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#C9A063]/10 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-4 h-4 text-[#C9A063]" strokeWidth={2} />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-[#8B7355] uppercase tracking-wide">Luggage</span>
                        <p className="text-[13px] sm:text-[14px] font-medium text-gray-700">{vehicle.luggage}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-14 sm:mt-16 text-center">
            <p className="text-gray-600 text-[15px] font-light mb-6">
              Need a specific vehicle or custom arrangement? Our team is here to help.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/reservation"
                className="group inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full bg-[#C9A063] text-white font-semibold shadow-sm hover:bg-[#B8935A] active:scale-[0.98] transition-all duration-200"
              >
                Book a ride
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" strokeWidth={2.5} />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:border-[#C9A063] hover:text-[#C9A063] transition-all duration-300"
              >
                View services
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
