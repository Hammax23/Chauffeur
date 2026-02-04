import Link from "next/link";
import { services, type ServiceIconKey } from "@/data/services";
import {
  PlaneTakeoff,
  Building2,
  Route,
  Timer,
  Gem,
  Landmark,
  ShieldCheck,
  Car,
  CarFront,
  PhoneCall,
  ArrowUpRight,
  ArrowRight,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

const iconMap: Record<ServiceIconKey, React.ElementType> = {
  PlaneTakeoff,
  Building2,
  Route,
  Timer,
  Gem,
  Landmark,
  ShieldCheck,
  Car,
  CarFront,
  PhoneCall,
};

const BASE_URL = "https://luxride-chauffeur.vercel.app";

const HIDDEN_SERVICE_SLUGS = ["point-to-point-transfers", "vip-transport", "luxury-fleet", "premium-services"];
const visibleServices = services.filter((s) => !HIDDEN_SERVICE_SLUGS.includes(s.slug));

export const metadata: Metadata = {
  title: "Our Services",
  description:
    "SARJ Worldwide chauffeur services: airport transfers, corporate travel, weddings, city tours, VIP transport & more. Premium vehicles, professional chauffeurs.",
  keywords: ["SARJ Worldwide chauffeur services", "chauffeur services", "airport transfer chauffeur", "corporate chauffeur", "wedding chauffeur", "VIP chauffeur transport"],
  openGraph: {
    title: "Our Services | SARJ Worldwide Chauffeur Services",
    description: "Chauffeur services: airport transfers, corporate travel, weddings, city tours, VIP transport. Premium vehicles, professional chauffeurs.",
    url: `${BASE_URL}/services`,
    siteName: "SARJ Worldwide Chauffeur Services",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Our Services | SARJ Worldwide Chauffeur Services" },
  alternates: { canonical: `${BASE_URL}/services` },
};

export default function ServicesIndexPage() {
  return (
    <main className="min-h-screen bg-[#fafafa]">
      <TopNav />
      <Navbar />

      {/* Hero */}
      <section className="pt-[155px] md:pt-[175px] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-transparent to-transparent" />
        <div className="max-w-[1000px] mx-auto px-6 sm:px-8 md:px-12 py-16 sm:py-20 md:py-24 relative z-10">
          <div className="text-center">
            <p className="text-[#C9A063] text-[12px] sm:text-[13px] font-semibold tracking-[0.2em] uppercase mb-3">
              What we offer
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">
              Our Services
            </h1>
            <p className="text-gray-600 text-[15px] sm:text-[16px] max-w-xl mx-auto leading-relaxed">
              From airport transfers to corporate travel, weddings, and VIP transport—every journey is crafted with elegance and reliability.
            </p>
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section className="relative pb-16 sm:pb-20 md:pb-24">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12">
          <p className="text-center text-gray-500 text-[14px] sm:text-[15px] mb-12 max-w-lg mx-auto">
            Select a service to view full details, features, and how to book.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {visibleServices.map((service) => {
              const Icon = iconMap[service.icon];
              return (
                <Link
                  key={service.slug}
                  href={`/services/${service.slug}`}
                  className="group relative block rounded-2xl bg-white border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:shadow-[#C9A063]/10 hover:border-[#C9A063]/30 hover:-translate-y-1.5 transition-all duration-500 ease-out overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#C9A063]/30 via-[#C9A063] to-[#C9A063]/30 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out" />
                  <div className="p-6 sm:p-7">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C9A063] to-[#A68B5B] flex items-center justify-center shadow-md shadow-[#C9A063]/20 border border-[#C9A063]/20 group-hover:shadow-lg group-hover:shadow-[#C9A063]/25 group-hover:scale-110 group-hover:border-[#C9A063]/30 group-hover:rotate-3 transition-all duration-500 ease-out">
                        <Icon className="w-7 h-7 text-white drop-shadow-sm" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-gray-900 font-bold text-[16px] sm:text-[17px] mb-2 tracking-tight leading-snug group-hover:text-[#C9A063] transition-colors duration-300">
                          {service.title}
                        </h2>
                        <p className="text-gray-600 text-[14px] leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                          {service.shortDesc}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[#C9A063] text-[13px] font-semibold group-hover:tracking-wide transition-all duration-300">View details</span>
                      <span className="w-8 h-8 rounded-full bg-[#C9A063]/10 flex items-center justify-center group-hover:bg-[#C9A063] group-hover:shadow-md group-hover:shadow-[#C9A063]/20 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 ease-out">
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#C9A063] group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" strokeWidth={2.25} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA strip - with book cover */}
      <section className="py-16 sm:py-20 md:py-24">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] min-h-[280px] sm:min-h-[320px]">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url(/book.png)" }}
            />
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#C9A063] to-[#A68B5B]" />
            <div className="relative py-14 sm:py-16 text-center px-6 sm:px-10">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight mb-3 drop-shadow-sm">
                Ready to book your ride?
              </h2>
              <p className="text-white/90 text-[14px] sm:text-[15px] max-w-lg mx-auto mb-8 drop-shadow-sm">
                Choose a service above or go straight to booking. Our team is available 24/7 to assist you.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <Link
                  href="/reservation"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#C9A063] text-white text-[15px] font-semibold shadow-md hover:bg-[#B8935A] hover:shadow-lg hover:shadow-[#C9A063]/25 active:scale-[0.98] transition-all duration-200"
                >
                  Book a ride
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" strokeWidth={2} />
                </Link>
                <Link
                  href="/fleet"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/95 text-gray-800 text-[15px] font-medium border border-white/50 hover:bg-white hover:text-[#C9A063] transition-all duration-200"
                >
                  View our fleet
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
