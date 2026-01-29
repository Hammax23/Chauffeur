import Link from "next/link";
import { services, type ServiceIconKey } from "@/data/services";
import {
  Plane,
  Briefcase,
  MapPin,
  Clock,
  Heart,
  Camera,
  Shield,
  Car,
  Sparkles,
  Headphones,
  ArrowUpRight,
  ArrowRight,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

const iconMap: Record<ServiceIconKey, React.ElementType> = {
  Plane,
  Briefcase,
  MapPin,
  Clock,
  Heart,
  Camera,
  Shield,
  Car,
  Sparkles,
  Headphones,
};

export const metadata: Metadata = {
  title: "Our Services",
  description:
    "Luxury chauffeur services: airport transfers, corporate travel, weddings, city tours, VIP transport & more. Premium vehicles, professional drivers.",
};

export default function ServicesIndexPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <TopNav />
      <Navbar />

      {/* Hero */}
      <section className="pt-[130px] md:pt-[145px] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C9A063]/[0.03] via-transparent to-[#C9A063]/[0.05]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-[#C9A063]/20 to-transparent" />
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 md:px-12 py-14 sm:py-16 md:py-20 relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white border border-[#C9A063]/30 shadow-lg shadow-[#C9A063]/10 mb-6">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#C9A063] to-[#B8935A] animate-pulse" />
              <span className="text-gray-800 text-[13px] sm:text-[14px] font-bold tracking-[0.2em] uppercase">
                Our Services
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-5">
              Luxury Chauffeur Services
            </h1>
            <p className="text-gray-600 text-[15px] sm:text-[17px] md:text-[18px] max-w-2xl mx-auto leading-relaxed font-light">
              From airport transfers to corporate travel, weddings, and VIP transport—every journey
              is crafted with elegance and reliability.
            </p>
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section className="relative pb-14 sm:pb-16 md:pb-20">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 md:px-12">
          <p className="text-center text-gray-600 text-[14px] sm:text-[15px] mb-10 max-w-2xl mx-auto">
            Click any service below to view full details, features &amp; how to book.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {services.map((service) => {
              const Icon = iconMap[service.icon];
              return (
                <Link
                  key={service.slug}
                  href={`/services/${service.slug}`}
                  className="group relative block rounded-2xl bg-white border border-gray-200/80 shadow-lg shadow-gray-200/40 hover:shadow-xl hover:shadow-[#C9A063]/15 hover:border-[#C9A063]/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  {/* Top accent */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C9A063]/0 via-[#C9A063]/30 to-[#C9A063]/0 group-hover:from-[#C9A063] group-hover:via-[#C9A063] group-hover:to-[#C9A063] transition-all duration-300" />
                  <div className="p-6 sm:p-8">
                    <div className="flex items-start gap-5">
                      <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C9A063] to-[#A68B5B] flex items-center justify-center shadow-md shadow-[#C9A063]/25 group-hover:shadow-lg group-hover:shadow-[#C9A063]/30 group-hover:scale-105 transition-all duration-300">
                        <Icon className="w-8 h-8 text-white" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-gray-900 font-bold text-[17px] sm:text-[18px] mb-2.5 tracking-tight leading-snug group-hover:text-[#C9A063] transition-colors">
                          {service.title}
                        </h2>
                        <p className="text-gray-600 text-[14px] sm:text-[15px] leading-relaxed">
                          {service.shortDesc}
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[#C9A063] text-[14px] font-semibold">View details</span>
                      <span className="w-9 h-9 rounded-full bg-[#C9A063]/10 flex items-center justify-center group-hover:bg-[#C9A063] transition-colors duration-300">
                        <ArrowUpRight className="w-4 h-4 text-[#C9A063] group-hover:text-white transition-colors duration-300" strokeWidth={2.5} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="py-14 sm:py-16 md:py-20">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="relative rounded-2xl overflow-hidden border border-[#C9A063]/20 bg-gradient-to-br from-[#C9A063]/[0.06] via-white to-[#C9A063]/[0.04] shadow-lg shadow-[#C9A063]/10">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A063]/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A063]/40 to-transparent" />
            <div className="relative py-12 sm:py-14 md:py-16 text-center px-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-4">
                Ready to book your ride?
              </h2>
              <p className="text-gray-600 text-[15px] sm:text-[16px] max-w-xl mx-auto mb-8">
                Choose a service above or head straight to booking. Our team is available 24/7 to
                assist you.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/#book"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#C9A063] to-[#A68B5B] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#C9A063]/30 transition-all duration-300"
                >
                  Book a ride
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </Link>
                <Link
                  href="/fleet"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:border-[#C9A063] hover:text-[#C9A063] transition-all duration-300"
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
