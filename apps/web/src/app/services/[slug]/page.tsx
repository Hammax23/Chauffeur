import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getServiceBySlug,
  getAllServiceSlugs,
} from "@/lib/managed-services";
import { type ServiceIconKey } from "@/data/services";
import {
  Plane,
  PlaneTakeoff,
  Building2,
  Route,
  Timer,
  Gem,
  Landmark,
  Handshake,
  ShieldCheck,
  Car,
  CarFront,
  PhoneCall,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ServiceContentBlocks from "@/components/ServiceContentBlocks";

import ServiceQuoteForm from "@/components/ServiceQuoteForm";
import ServiceFAQSection from "@/components/ServiceFAQSection";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo-metadata";

const iconMap: Record<ServiceIconKey, React.ElementType> = {
  PlaneTakeoff,
  Building2,
  Route,
  Timer,
  Gem,
  Landmark,
  Handshake,
  ShieldCheck,
  Car,
  CarFront,
  PhoneCall,
};

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getAllServiceSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return { title: "Service Not Found" };
  return buildPageMetadata(`/services/${slug}`, {
    title: `${service.title} | SARJ Worldwide Chauffeur Services`,
    description: service.shortDesc,
    keywords: [service.title, "SARJ Worldwide chauffeur", "chauffeur service", "premium chauffeur"],
  });
}

const heroImageMap: Record<string, string> = {
  "airport-transfers": "/heropics/airport2.png",
  "corporate-travel": "/heropics/buisnesstravel.png",
  "hourly-chauffeur": "/heropics/hourlyasdirected.png",
  "wedding-events": "/heropics/wed.jpeg",
};

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const Icon = iconMap[service.icon];
  const baseUrl = "https://sarjworldwide.ca";
  const serviceUrl = `${baseUrl}/services/${slug}`;
  const bgImage = heroImageMap[slug] || "/cover1.jpeg";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
      { "@type": "ListItem", "position": 2, "name": "Services", "item": `${baseUrl}/services` },
      { "@type": "ListItem", "position": 3, "name": service.title, "item": serviceUrl },
    ],
  };

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": service.title,
    "description": service.description,
    "provider": { "@type": "LocalBusiness", "name": "SARJ Worldwide Chauffeur Services" },
    "url": serviceUrl,
  };

  return (
    <GoogleMapsProvider>
      <main className="flex flex-col gap-12 md:gap-16 bg-white min-h-screen">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
        <TopNav />
        <Navbar />

        {/* Full-width Hero block */}
        <section className="relative min-h-[400px] md:min-h-[500px] pt-[120px] md:pt-[140px] flex flex-col justify-center overflow-hidden">
          {/* Background Image & Overlays */}
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${bgImage})` }} />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60" />

          <div className="relative max-w-[1250px] w-full mx-auto px-6 sm:px-8 md:px-12 z-10 py-10 md:py-16 flex flex-col items-center text-center">

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-[56px] lg:text-[64px] font-bold tracking-tight mb-4 leading-[1.1]">
              <span className="text-white">
                {(service.heroTitle || service.title).split(' ').length > 1 ? (service.heroTitle || service.title).split(' ').slice(0, -1).join(' ') + ' ' : ''}
              </span>
              <span className="text-[#C9A063]">
                {(service.heroTitle || service.title).split(' ').slice(-1)}
              </span>
            </h1>

            {/* Breadcrumb inside hero */}
            <div className="flex justify-center items-center gap-2 text-[#C9A063] text-[14px] font-medium mb-8">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>»</span>
              <Link href="/services" className="hover:text-white transition-colors">Services</Link>
              <span>»</span>
              <span>{service.title}</span>
            </div>

            {/* Description */}
            <div className="max-w-4xl mx-auto">
              <p className="text-base sm:text-[17px] text-white/90 font-light leading-relaxed">
                {service.description.length > 350
                  ? service.description.substring(0, 350) + "..."
                  : service.description}
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center items-center gap-4 mt-8">
              <Link
                href="/reservation"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-[#C9A063] text-black text-[13px] font-bold uppercase tracking-[0.1em] rounded-md hover:bg-[#B8935A] transition-all duration-300 shadow-[0_0_20px_rgba(201,160,99,0.3)] hover:shadow-[0_0_30px_rgba(201,160,99,0.5)]"
              >
                Book Now
              </Link>
              <a
                href="tel:4168935779"
                className="inline-flex items-center justify-center px-8 py-3.5 border border-white text-white text-[13px] font-bold uppercase tracking-[0.1em] rounded-md hover:bg-white hover:text-black transition-all duration-300"
              >
                Call +1 416-893-5779
              </a>
            </div>
          </div>
        </section>



        {/* Alternating Content Blocks (replaces previous main layout) */}
        <ServiceContentBlocks service={service} />



        {/* --- AIRPORT SERVICE ONLY: Destinations Section --- */}
        {service.slug === 'airport-transfers' && (
          <section className="relative w-full py-16 md:py-24 overflow-hidden border-y border-[#333]">
            {/* Background Texture overlay */}
            <div className="absolute inset-0 bg-[url('/heropics/airport2.png')] bg-cover bg-center bg-fixed" />
            <div className="absolute inset-0 bg-black/80" />

            <div className="relative max-w-[1250px] mx-auto px-6 sm:px-8 md:px-12 z-10">
              <div className="text-center mb-16 md:mb-20 max-w-3xl mx-auto">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="h-[1px] w-12 bg-[#c8a165]" />
                  <span className="text-[#c8a165] font-semibold tracking-[0.3em] text-[11px] sm:text-[12px] uppercase">
                    Across Southern Ontario
                  </span>
                  <div className="h-[1px] w-12 bg-[#c8a165]" />
                </div>
                <h2 className="text-4xl sm:text-5xl md:text-[56px] font-serif text-white font-bold mb-6 leading-[1.15]">
                  Airport transportation,<br className="hidden sm:block" /> wherever you fly
                </h2>
                <p className="text-[#9ca3af] text-[15px] sm:text-[17px] leading-relaxed max-w-2xl mx-auto">
                  One trusted provider for every airport run — flat fares, professional chauffeurs and reliable scheduling from anywhere in Oakville and Halton.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {[
                  { code: 'YYZ', name: 'Toronto Pearson Intl', desc: 'Approx. 30-40 min via the QEW' },
                  { code: 'YTZ', name: 'Billy Bishop City', desc: 'Downtown Toronto island airport' },
                  { code: 'YHM', name: 'Hamilton Intl', desc: 'Approx. 25 min via QEW & 403' },
                  { code: 'BUF', name: 'Buffalo Niagara Intl', desc: 'Cross-border transfers, USA' },
                  { code: 'YKF', name: 'Region of Waterloo Intl', desc: 'Kitchener-Waterloo regional' },
                  { code: 'YXU', name: 'London Intl', desc: 'Plus Ottawa & Windsor on request' },
                ].map((airport) => (
                  <div 
                    key={airport.code} 
                    className="group relative bg-white/5 backdrop-blur-md border border-white/10 hover:border-[#c8a165]/50 hover:bg-white/10 rounded-2xl overflow-hidden transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-[#c8a165]/10 flex items-stretch h-[120px] sm:h-[140px]"
                  >
                    {/* Golden edge indicator */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#c8a165]/0 via-[#c8a165]/80 to-[#c8a165]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Airport Code Block */}
                    <div className="w-[100px] sm:w-[130px] bg-black/40 border-r border-white/10 flex flex-col items-center justify-center shrink-0 p-4 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#c8a165]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <Plane className="w-5 h-5 sm:w-6 sm:h-6 text-[#c8a165] mb-2 transform -rotate-45 group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-500" strokeWidth={2} />
                      <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-widest relative z-10">{airport.code}</h3>
                    </div>

                    {/* Details Block */}
                    <div className="flex-1 p-5 sm:p-6 flex flex-col justify-center relative">
                      {/* Decorative arrow icon sliding in from right */}
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 ease-out">
                        <ArrowRight className="w-5 h-5 text-[#c8a165]" />
                      </div>
                      
                      <div className="text-white font-medium text-[16px] sm:text-[18px] mb-1.5 group-hover:text-[#c8a165] transition-colors duration-300 pr-8">{airport.name}</div>
                      <div className="text-gray-400 text-[13px] sm:text-[14px] leading-snug pr-8 group-hover:text-gray-300 transition-colors duration-300">{airport.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Full-width Sections Below */}
        <div className="max-w-[1250px] w-full mx-auto px-6 sm:px-8 md:px-12 py-0 flex flex-col gap-12 md:gap-16">


          {/* CTA strip */}
          <section className="w-full">
            <div className="relative rounded-3xl overflow-hidden border border-[#C9A063]/20 bg-gradient-to-br from-[#C9A063]/[0.3] via-[#C9A063]/[0.15] to-[#C9A063]/[0.25] shadow-sm">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A063]/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A063]/40 to-transparent" />
              <div className="relative py-14 sm:py-16 text-center px-6">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
                  Ready to book {service.title}?
                </h2>
                <p className="text-gray-600 text-[16px] sm:text-[17px] max-w-xl mx-auto mb-8">
                  Get in touch or head to our booking form. Our team is available 24/7 to assist you.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link
                    href="/#book"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#C9A063] to-[#A68B5B] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#C9A063]/30 transition-all duration-300"
                  >
                    Book this service
                    <ArrowRight className="w-5 h-5" strokeWidth={2} />
                  </Link>
                  <Link
                    href="/services"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:border-[#C9A063] hover:text-[#C9A063] transition-all duration-300"
                  >
                    View all services
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Service FAQ Section */}
          <ServiceFAQSection slug={service.slug} title={service.title} />
        </div>

        <Footer />
      </main>
    </GoogleMapsProvider>
  );
}
