import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Car, Users, Award, Globe, Clock, Shield, MapPin } from "lucide-react";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "LuxRide Chauffeur—premium luxury transportation. Our story, mission, and commitment to elegance, reliability, and world-class chauffeur service.",
};

const stats = [
  { value: "10+", label: "Years of excellence", icon: Clock },
  { value: "50K+", label: "Rides completed", icon: Car },
  { value: "24/7", label: "Concierge support", icon: Shield },
  { value: "Global", label: "Major cities served", icon: MapPin },
];

const values = [
  {
    icon: Car,
    title: "Premium Fleet",
    description: "Mercedes, BMW, Range Rover & limousines maintained to the highest standards.",
  },
  {
    icon: Users,
    title: "Expert Chauffeurs",
    description: "Trained in hospitality, discretion, and punctuality for every occasion.",
  },
  {
    icon: Award,
    title: "Transparent Pricing",
    description: "Clear rates, no hidden fees. Luxury service you can trust from start to finish.",
  },
  {
    icon: Globe,
    title: "Global Reach",
    description: "Serving clients across major cities worldwide with the same premium standards.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <TopNav />
      <Navbar />

      {/* Hero */}
      <section className="pt-[130px] md:pt-[145px] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C9A063]/[0.03] via-transparent to-[#C9A063]/[0.05]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-[#C9A063]/20 to-transparent" />
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12 py-14 sm:py-16 md:py-20 relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white border border-[#C9A063]/30 shadow-lg shadow-[#C9A063]/10 mb-6">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#C9A063] to-[#B8935A] animate-pulse" />
              <span className="text-gray-800 text-[13px] sm:text-[14px] font-bold tracking-[0.2em] uppercase">
                About LuxRide
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-5">
              Where Luxury Meets Reliability
            </h1>
            <p className="text-gray-600 text-[15px] sm:text-[17px] md:text-[18px] max-w-2xl mx-auto leading-relaxed font-light">
              We&apos;re more than a chauffeur service—we craft experiences that match your lifestyle
              and exceed your expectations.
            </p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative -mt-4 sm:-mt-6 z-20">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {stats.map(({ value, label, icon: Icon }) => (
              <div
                key={label}
                className="group flex flex-col items-center sm:flex-row sm:items-center gap-3 sm:gap-4 p-5 sm:p-6 rounded-2xl bg-white border border-gray-100 shadow-md shadow-gray-200/50 hover:shadow-xl hover:shadow-[#C9A063]/10 hover:border-[#C9A063]/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C9A063] to-[#A68B5B] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#C9A063]/20 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
                  <p className="text-[13px] sm:text-[14px] text-gray-600 font-light">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story + Image */}
      <section className="py-14 sm:py-16 md:py-20">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="pl-6 border-l-4 border-[#C9A063] rounded-l">
              <span className="inline-block text-[12px] sm:text-[13px] font-bold tracking-[0.2em] uppercase text-[#C9A063] mb-4">
                Our Story
              </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-5">
                  Built on a belief that every journey deserves to be exceptional
                </h2>
              <p className="text-gray-600 text-[15px] sm:text-[16px] leading-relaxed">
                LuxRide was founded on a simple idea: whether you&apos;re heading to the airport, a
                critical business meeting, or your wedding, you deserve luxury chauffeur services
                that combine elegance, punctuality, and discretion. Our curated fleet and
                professional drivers have served clients across major cities worldwide, earning a
                reputation for reliability and world-class service.
              </p>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-xl shadow-gray-300/50 border border-gray-100">
              <div className="aspect-[4/3] sm:aspect-[3/4] lg:aspect-[4/5] relative">
                <Image
                  src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop"
                  alt="Luxury chauffeur service"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-10 sm:py-14 md:py-16">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="relative rounded-2xl bg-white border border-gray-100 shadow-lg shadow-gray-200/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#C9A063]/[0.02] to-transparent pointer-events-none" />
            <div className="relative p-8 sm:p-10 md:p-12">
              <span className="inline-block text-[12px] sm:text-[13px] font-bold tracking-[0.2em] uppercase text-[#C9A063] mb-4">
                Our Mission
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-5">
                Seamless, stress-free transportation so you can focus on what matters
              </h2>
              <p className="text-gray-600 text-[15px] sm:text-[16px] leading-relaxed max-w-3xl">
                We handle every detail—flight tracking, meet & greet, multi-stop itineraries, and
                round-the-clock support. From airport transfers and corporate travel to weddings and
                VIP events, our mission is to make every ride feel like a privilege, not a chore.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why LuxRide — Values */}
      <section className="py-14 sm:py-16 md:py-20">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="text-center mb-12 sm:mb-14">
            <span className="inline-block text-[12px] sm:text-[13px] font-bold tracking-[0.2em] uppercase text-[#C9A063] mb-3">
              Why LuxRide
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              What sets us apart
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {values.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group p-6 sm:p-7 rounded-2xl bg-white border border-gray-100 shadow-md shadow-gray-200/50 hover:shadow-xl hover:shadow-[#C9A063]/10 hover:border-[#C9A063]/30 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C9A063] to-[#A68B5B] flex items-center justify-center mb-5 shadow-lg shadow-[#C9A063]/20 group-hover:scale-105 transition-transform duration-300">
                  <Icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="text-gray-900 font-bold text-[16px] sm:text-[17px] mb-2 tracking-tight">
                  {title}
                </h3>
                <p className="text-gray-600 text-[14px] sm:text-[15px] leading-relaxed font-light">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="py-14 sm:py-16 md:py-20">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="relative rounded-2xl overflow-hidden border border-[#C9A063]/20 bg-gradient-to-br from-[#C9A063]/[0.06] via-white to-[#C9A063]/[0.04] shadow-lg shadow-[#C9A063]/10">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A063]/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A063]/40 to-transparent" />
            <div className="relative py-12 sm:py-14 md:py-16 text-center px-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-4">
                Ready to experience luxury?
              </h2>
              <p className="text-gray-600 text-[15px] sm:text-[16px] max-w-xl mx-auto mb-8">
                Book your ride today or explore our services. Our team is here to make every journey
                exceptional.
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
                  href="/services"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:border-[#C9A063] hover:text-[#C9A063] transition-all duration-300"
                >
                  Our services
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
