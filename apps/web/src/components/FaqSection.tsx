"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ArrowRight, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "How do I book a chauffeur with SARJ Worldwide?",
    answer:
      "You can reserve online through our reservation page, request a quote, or contact our 24/7 concierge team by phone. Simply enter your trip details, select your vehicle, choose your date and time, and confirm your booking.",
  },
  {
    question: "What types of vehicles are available in your fleet?",
    answer:
      "Our fleet includes luxury sedans, executive SUVs, sprinters, and limousines. Every vehicle is maintained to the highest standards and equipped with amenities such as Wi-Fi, phone chargers, and bottled water.",
  },
  {
    question: "Do you provide airport transfers with flight tracking?",
    answer:
      "Yes. We offer premium airport transfers with real-time flight monitoring, complimentary wait time from touchdown, and optional meet-and-greet service so your chauffeur adjusts to delays or early arrivals.",
  },
  {
    question: "Are your chauffeurs licensed and insured?",
    answer:
      "Absolutely. All SARJ Worldwide chauffeurs are fully licensed, professionally trained, background-checked, and covered by commercial insurance. We maintain the highest standards of safety, discretion, and service.",
  },
  {
    question: "Can I book for corporate travel or special events?",
    answer:
      "Yes. We specialize in corporate chauffeur service, weddings, VIP transport, city tours, and multi-stop itineraries. Dedicated account support and corporate billing options are available for business clients.",
  },
  {
    question: "What is your cancellation and change policy?",
    answer:
      "We understand plans change. Cancellation and modification terms depend on your booking type and notice period. Contact our team as early as possible to adjust your reservation — we aim to be flexible whenever we can.",
  },
  {
    question: "Which areas and cities do you serve?",
    answer:
      "SARJ Worldwide provides chauffeur services across major cities in Canada and internationally. Visit our Cities We Serve page or speak with our concierge team to confirm availability for your specific route.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept secure online card payments through our reservation system. Corporate clients may arrange invoicing and approved payment terms. All pricing is confirmed transparently before you complete your booking.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="relative py-12 md:py-16 bg-white overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-[#C9A063]/25 to-transparent" />

      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8 lg:gap-12 xl:gap-16 items-start">
          {/* Left — intro */}
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-200 bg-[#fafafa] mb-4">
              <HelpCircle className="w-3.5 h-3.5 text-[#C9A063]" strokeWidth={2} />
              <span className="text-gray-800 text-[11px] sm:text-[12px] font-medium tracking-widest uppercase">
                FAQs
              </span>
            </div>

            <h2 className="text-[#1a2b3c] text-2xl sm:text-3xl md:text-[32px] font-bold tracking-tight mb-3 leading-tight">
              Frequently Asked Questions
            </h2>

            <p className="text-gray-500 text-[14px] sm:text-[15px] leading-relaxed mb-6 max-w-md">
              Find quick answers about booking, fleet, airport transfers, corporate service, and more.
              Our team is available 24/7 if you need personal assistance.
            </p>

            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 text-[#C9A063] font-semibold text-[14px] hover:text-[#B8935A] transition-colors"
            >
              Contact our team
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
            </Link>
          </div>

          {/* Right — accordion */}
          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={faq.question}
                  className={`rounded-xl border transition-all duration-300 ${
                    isOpen
                      ? "border-[#C9A063]/35 bg-[#fafafa] shadow-sm shadow-[#C9A063]/5"
                      : "border-gray-100 bg-white hover:border-gray-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(index)}
                    className="w-full flex items-start justify-between gap-4 px-5 py-4 sm:px-6 sm:py-4.5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span
                      className={`text-[14px] sm:text-[15px] font-semibold leading-snug transition-colors ${
                        isOpen ? "text-[#1a2b3c]" : "text-gray-800"
                      }`}
                    >
                      {faq.question}
                    </span>
                    <span
                      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                        isOpen ? "bg-[#C9A063] text-white rotate-180" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
                    </span>
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 sm:px-6 pb-4 sm:pb-5 text-gray-500 text-[13px] sm:text-[14px] leading-relaxed border-t border-gray-100/80 pt-3.5">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
