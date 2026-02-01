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

      <section className="pt-[130px] md:pt-[145px]">
        <div className="max-w-[1300px] mx-auto px-6 sm:px-8 md:px-12 py-12 sm:py-16 md:py-20">
          <div className="text-center mb-14 sm:mb-16">
            <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white border border-[#C9A063]/30 shadow-lg shadow-[#C9A063]/10 mb-6">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#C9A063] to-[#B8935A] animate-pulse" />
              <span className="text-gray-800 text-[13px] sm:text-[14px] font-bold tracking-[0.2em] uppercase">
                Our Fleet
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">
              Curated Luxury Vehicles
            </h1>
            <p className="text-gray-600 text-[15px] sm:text-[17px] max-w-2xl mx-auto leading-relaxed font-light">
              From executive sedans to premium SUVs and vans—each vehicle is maintained to the
              highest standards and ready to elevate your journey.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {fleetData.map((vehicle) => (
              <article
                key={vehicle.id}
                className="group rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl hover:border-[#C9A063]/30 transition-all duration-300"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  <Image
                    src={vehicle.image}
                    alt={vehicle.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
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

                  <div className="flex items-center gap-6 text-gray-600 mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#C9A063]/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-[#C9A063]" strokeWidth={2} />
                      </div>
                      <span className="text-[13px] sm:text-[14px] font-medium text-gray-700">
                        {vehicle.passengers} passengers
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#C9A063]/10 flex items-center justify-center">
                        <Briefcase className="w-4 h-4 text-[#C9A063]" strokeWidth={2} />
                      </div>
                      <span className="text-[13px] sm:text-[14px] font-medium text-gray-700">
                        {vehicle.luggage} luggage
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/#book"
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-[#C9A063] to-[#A68B5B] text-white text-[14px] font-semibold rounded-xl hover:shadow-lg hover:shadow-[#C9A063]/30 transition-all duration-300"
                  >
                    Book this vehicle
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </Link>
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
                href="/#book"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#C9A063] to-[#A68B5B] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#C9A063]/30 transition-all duration-300"
              >
                Book a ride
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
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
