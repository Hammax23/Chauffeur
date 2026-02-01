"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { newsArticles, type NewsCategory } from "@/data/news";
import { ArrowRight, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const categoryColors: Record<NewsCategory, string> = {
  Fleet: "bg-[#C9A063]/10 text-[#C9A063] border-[#C9A063]/30",
  "Travel Tips": "bg-blue-50 text-blue-700 border-blue-200",
  Company: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Industry: "bg-violet-50 text-violet-700 border-violet-200",
  Service: "bg-amber-50 text-amber-700 border-amber-200",
  Events: "bg-rose-50 text-rose-700 border-rose-200",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function NewsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
                SARJ Worldwide News
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-5">
              News &amp; Insights
            </h1>
            <p className="text-gray-600 text-[15px] sm:text-[17px] md:text-[18px] max-w-2xl mx-auto leading-relaxed font-light">
              Stay updated with fleet additions, travel tips, company updates, and industry trends
              from the SARJ Worldwide team.
            </p>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="pb-10 sm:pb-12">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="rounded-2xl bg-white border border-gray-100 shadow-md shadow-gray-200/50 p-6 sm:p-8 md:p-10">
            <p className="text-gray-700 text-[15px] sm:text-[16px] leading-relaxed mb-4">
              Welcome to the SARJ Worldwide News hub. Here we share updates on our chauffeur fleet, practical
              advice for stress-free travel, and insights from the world of premium ground
              transportation. Whether you are planning an airport transfer, a corporate trip, or a
              wedding, our aim is to keep you informed and ready for every journey.
            </p>
            <p className="text-gray-700 text-[15px] sm:text-[16px] leading-relaxed">
              From new vehicles and service launches to seasonal booking tips and industry trends,
              you will find it all here. Browse the articles below, and do not hesitate to get in
              touch if you would like to learn more about our chauffeur services.
            </p>
          </div>
        </div>
      </section>

      {/* News grid */}
      <section className="py-6 sm:py-8 md:py-10">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="space-y-6 sm:space-y-8">
            {newsArticles.map((article) => {
              const isExpanded = expandedId === article.id;
              return (
                <article
                  key={article.id}
                  className="rounded-2xl bg-white border border-gray-100 shadow-md shadow-gray-200/50 overflow-hidden hover:shadow-lg hover:shadow-[#C9A063]/10 hover:border-[#C9A063]/20 transition-all duration-300"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                    <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[220px]">
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        className="object-cover"
                      />
                      <div className="absolute top-4 left-4">
                        <span
                          className={`inline-block px-3 py-1.5 rounded-lg text-[12px] font-semibold border ${categoryColors[article.category]}`}
                        >
                          {article.category}
                        </span>
                      </div>
                    </div>
                    <div className="lg:col-span-2 p-6 sm:p-8 flex flex-col">
                      <div className="flex flex-wrap items-center gap-3 text-gray-500 text-[13px] sm:text-[14px] mb-3">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" strokeWidth={1.5} />
                          {formatDate(article.date)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" strokeWidth={1.5} />
                          {article.readTime}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mb-3">
                        {article.title}
                      </h2>
                      <p className="text-gray-600 text-[14px] sm:text-[15px] leading-relaxed flex-1">
                        {article.excerpt}
                      </p>
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-gray-700 text-[15px] sm:text-[16px] leading-relaxed">
                            {article.content}
                          </p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : article.id)}
                        className="mt-4 inline-flex items-center gap-2 text-[#C9A063] font-semibold text-[14px] sm:text-[15px] hover:underline"
                      >
                        {isExpanded ? (
                          <>
                            Show less
                            <ChevronUp className="w-4 h-4" strokeWidth={2} />
                          </>
                        ) : (
                          <>
                            Read more
                            <ChevronDown className="w-4 h-4" strokeWidth={2} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-16 md:py-20">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="relative rounded-2xl overflow-hidden border border-[#C9A063]/20 bg-gradient-to-br from-[#C9A063]/[0.06] via-white to-[#C9A063]/[0.04] shadow-lg shadow-[#C9A063]/10">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A063]/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A063]/40 to-transparent" />
            <div className="relative py-12 sm:py-14 md:py-16 text-center px-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-4">
                Ready to experience luxury travel?
              </h2>
              <p className="text-gray-600 text-[15px] sm:text-[16px] max-w-xl mx-auto mb-8">
                Book a ride, request a quote, or explore our services. Our team is here to help.
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
                  href="/quote"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:border-[#C9A063] hover:text-[#C9A063] transition-all duration-300"
                >
                  Get a quote
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
