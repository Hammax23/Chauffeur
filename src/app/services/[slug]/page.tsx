import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getServiceBySlug,
  getAllServiceSlugs,
  type ServiceIconKey,
} from "@/data/services";
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
  ArrowLeft,
  ArrowRight,
  Check,
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

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAllServiceSlugs().map((slug) => ({ slug }));
}

const BASE_URL = "https://luxride-chauffeur.vercel.app";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return { title: "Service Not Found" };
  const url = `${BASE_URL}/services/${slug}`;
  return {
    title: service.title,
    description: service.shortDesc,
    keywords: [service.title, "SARJ Worldwide chauffeur", "chauffeur service", "premium chauffeur"],
    openGraph: {
      title: `${service.title} | SARJ Worldwide Chauffeur Services`,
      description: service.shortDesc,
      url,
      siteName: "SARJ Worldwide Chauffeur Services",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: `${service.title} | SARJ Worldwide Chauffeur Services` },
    alternates: { canonical: url },
  };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  const Icon = iconMap[service.icon];
  const serviceUrl = `${BASE_URL}/services/${slug}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
      { "@type": "ListItem", "position": 2, "name": "Services", "item": `${BASE_URL}/services` },
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
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <TopNav />
      <Navbar />

      {/* Breadcrumb */}
      <section className="pt-[130px] md:pt-[145px]">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12 pt-8 pb-4">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#C9A063] text-[14px] font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            All Services
          </Link>
        </div>
      </section>

      {/* Hero block */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C9A063]/[0.03] via-transparent to-[#C9A063]/[0.05]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-[#C9A063]/20 to-transparent" />
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12 py-10 sm:py-14 md:py-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-start gap-8 md:gap-12">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#C9A063] to-[#A68B5B] flex items-center justify-center shadow-xl shadow-[#C9A063]/25">
                <Icon className="w-10 h-10 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">
                {service.title}
              </h1>
              <p className="text-lg sm:text-xl text-[#C9A063] font-medium mb-6 leading-relaxed">
                {service.shortDesc}
              </p>
              <span className="inline-block text-[12px] sm:text-[13px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-3">
                About this service
              </span>
              <p className="text-gray-700 text-[16px] sm:text-[17px] leading-relaxed font-normal">
                {service.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="py-10 sm:py-14 md:py-16">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="mb-8">
            <span className="inline-block text-[12px] sm:text-[13px] font-bold tracking-[0.2em] uppercase text-[#C9A063] mb-3">
              What&apos;s included
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Everything you need for a seamless experience
            </h2>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {service.features.map((feature, i) => (
              <li
                key={i}
                className="group flex items-center gap-4 p-5 sm:p-6 rounded-2xl bg-white border border-gray-100 shadow-md shadow-gray-200/50 hover:shadow-lg hover:shadow-[#C9A063]/10 hover:border-[#C9A063]/30 transition-all duration-300"
              >
                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#C9A063]/10 flex items-center justify-center group-hover:bg-[#C9A063]/20 transition-colors duration-300">
                  <Check className="w-5 h-5 text-[#C9A063]" strokeWidth={2.5} />
                </span>
                <span className="text-gray-800 text-[15px] sm:text-[16px] font-medium">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
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
                Ready to book {service.title}?
              </h2>
              <p className="text-gray-600 text-[15px] sm:text-[16px] max-w-xl mx-auto mb-8">
                Get in touch or head to our booking form. Our team is available 24/7 to assist you.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/#book"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#C9A063] to-[#A68B5B] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#C9A063]/30 transition-all duration-300"
                >
                  Book this service
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
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
        </div>
      </section>

      <Footer />
    </main>
  );
}
