"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowRight,
  Send,
  MessageCircle,
  Headphones,
  ChevronLeft,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const contactCards = [
  {
    icon: Phone,
    title: "Call us",
    value: "+1 (800) 900-122",
    href: "tel:+1800900122",
    sub: "24/7 available",
  },
  {
    icon: Mail,
    title: "Email us",
    value: "info@luxride.com",
    href: "mailto:info@luxride.com",
    sub: "We respond within 24 hours",
  },
  {
    icon: MapPin,
    title: "Visit us",
    value: "Dubai, Water Tower, Office 123",
    href: "https://maps.google.com",
    sub: "By appointment",
  },
  {
    icon: Clock,
    title: "Business hours",
    value: "24/7 concierge & support",
    sub: "Bookings, changes & enquiries",
  },
];

const PROGRESS = { 1: 33, 2: 67, 3: 100 } as const;

const countryCodes = [
  { code: "+1", label: "US" },
  { code: "+44", label: "UK" },
  { code: "+91", label: "IN" },
  { code: "+92", label: "PK" },
  { code: "+971", label: "AE" },
  { code: "+966", label: "SA" },
  { code: "+973", label: "BH" },
  { code: "+974", label: "QA" },
  { code: "+968", label: "OM" },
  { code: "+965", label: "KW" },
  { code: "+20", label: "EG" },
  { code: "+49", label: "DE" },
  { code: "+33", label: "FR" },
  { code: "+39", label: "IT" },
  { code: "+34", label: "ES" },
  { code: "+31", label: "NL" },
  { code: "+32", label: "BE" },
  { code: "+41", label: "CH" },
  { code: "+43", label: "AT" },
  { code: "+46", label: "SE" },
  { code: "+47", label: "NO" },
  { code: "+45", label: "DK" },
  { code: "+358", label: "FI" },
  { code: "+48", label: "PL" },
  { code: "+7", label: "RU" },
  { code: "+81", label: "JP" },
  { code: "+86", label: "CN" },
  { code: "+82", label: "KR" },
  { code: "+61", label: "AU" },
  { code: "+64", label: "NZ" },
  { code: "+55", label: "BR" },
  { code: "+52", label: "MX" },
  { code: "+54", label: "AR" },
  { code: "+27", label: "ZA" },
  { code: "+234", label: "NG" },
  { code: "+254", label: "KE" },
  { code: "+60", label: "MY" },
  { code: "+65", label: "SG" },
  { code: "+66", label: "TH" },
  { code: "+62", label: "ID" },
  { code: "+63", label: "PH" },
  { code: "+84", label: "VN" },
  { code: "+98", label: "IR" },
  { code: "+90", label: "TR" },
  { code: "+212", label: "MA" },
  { code: "+213", label: "DZ" },
];

export default function ContactPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("+92");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [recaptchaDone, setRecaptchaDone] = useState(false);

  const percent = PROGRESS[step];
  const emailInvalid = emailTouched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const nameInvalid = nameTouched && !name.trim();
  const phoneInvalid = phoneTouched && !/^[\d\s+\-()]{8,}$/.test(phone);

  const handleNext = () => {
    if (step === 1) {
      setEmailTouched(true);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
      setStep(2);
    }
    if (step === 2) {
      setNameTouched(true);
      setPhoneTouched(true);
      if (!name.trim() || !/^[\d\s+\-()]{8,}$/.test(phone)) return;
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    if (step === 3) {
      setRecaptchaDone(false);
      setStep(2);
    }
  };


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
                Get in Touch
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-5">
              Contact Us
            </h1>
            <p className="text-gray-600 text-[15px] sm:text-[17px] md:text-[18px] max-w-2xl mx-auto leading-relaxed font-light">
              Have a question or ready to book? Our team is here to help. Reach out anytime—we
              typically respond within 24 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Contact cards + Form */}
      <section className="py-10 sm:py-14 md:py-20">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14">
            {/* Left on desktop: Contact info + trust — Right on mobile (order 2) */}
            <div className="lg:col-span-1 space-y-8 order-2 lg:order-1">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mb-2">
                  Reach us directly
                </h2>
                <p className="text-gray-600 text-[15px] leading-relaxed">
                  Prefer to call or email? Use the details below. We&apos;re available around the
                  clock for bookings and support.
                </p>
              </div>
              <div className="space-y-4">
                {contactCards.map(({ icon: Icon, title, value, href, sub }) => (
                  <div
                    key={title}
                    className="group flex items-start gap-4 p-5 rounded-2xl bg-white border border-gray-100 shadow-md shadow-gray-200/50 hover:shadow-lg hover:shadow-[#C9A063]/10 hover:border-[#C9A063]/30 transition-all duration-300"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#C9A063] to-[#A68B5B] flex items-center justify-center shadow-md shadow-[#C9A063]/20 group-hover:scale-105 transition-transform duration-300">
                      <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold tracking-wide uppercase text-[#C9A063] mb-1">
                        {title}
                      </p>
                      {href ? (
                        <a
                          href={href}
                          target={href.startsWith("http") ? "_blank" : undefined}
                          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                          className="text-gray-900 font-semibold text-[15px] hover:text-[#C9A063] transition-colors"
                        >
                          {value}
                        </a>
                      ) : (
                        <p className="text-gray-900 font-semibold text-[15px]">{value}</p>
                      )}
                      {sub && (
                        <p className="text-gray-500 text-[13px] mt-0.5">{sub}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-[#C9A063]/[0.08] to-[#C9A063]/[0.04] border border-[#C9A063]/20 p-6">
                <div className="flex items-start gap-4">
                  <Headphones className="w-10 h-10 text-[#C9A063] flex-shrink-0" strokeWidth={1.5} />
                  <div>
                    <h3 className="text-gray-900 font-bold text-[16px] mb-1">
                      Dedicated support
                    </h3>
                    <p className="text-gray-600 text-[14px] leading-relaxed">
                      Our concierge team is ready for bookings, changes, and any questions. Experience
                      luxury service from first contact to final drop-off.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right on desktop: 3-step form — First on mobile (order 1) */}
            <div className="lg:col-span-2 order-1 lg:order-2">
              <div className="rounded-2xl bg-white border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden">
                <div className="bg-gradient-to-r from-[#C9A063]/[0.06] to-transparent px-6 sm:px-8 py-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#C9A063] to-[#A68B5B] flex items-center justify-center shadow-md shadow-[#C9A063]/20">
                      <MessageCircle className="w-6 h-6 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="text-gray-900 font-bold text-[18px] sm:text-[20px]">
                        Send a message
                      </h2>
                      <p className="text-gray-500 text-[14px]">
                        Complete the steps below—we&apos;ll get back to you shortly.
                      </p>
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (step === 3) {
                      // Submit logic (e.g. API call) can go here
                    }
                  }}
                  className="p-6 sm:p-8"
                >
                  {/* Step label */}
                  <p className="text-gray-500 text-[14px] font-medium mb-3">
                    Step {step} of 3
                  </p>

                  {/* Progress bar */}
                  <div className="h-2.5 sm:h-3 w-full bg-gray-200 rounded-full overflow-hidden mb-6 sm:mb-8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#C9A063] to-[#A68B5B] transition-all duration-500 ease-out flex items-center justify-end pr-1.5 sm:pr-2"
                      style={{ width: `${percent}%` }}
                    >
                      {percent >= 15 && (
                        <span className="text-[10px] sm:text-[11px] font-bold text-white drop-shadow-sm">
                          {percent}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Step 1: Email + Next */}
                  {step === 1 && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                      <div>
                        <label className="block text-gray-800 text-[14px] font-medium mb-2">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => setEmailTouched(true)}
                          placeholder="info@example.com"
                          className={`w-full px-4 py-3.5 border rounded-xl text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063] transition-all ${
                            emailInvalid ? "border-red-400 bg-red-50/50" : "border-gray-300"
                          }`}
                        />
                        {emailInvalid && (
                          <p className="mt-1.5 text-red-500 text-[13px]">Please enter a valid email address.</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#C9A063] to-[#A68B5B] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#C9A063]/30 transition-all duration-300"
                      >
                        Next
                      </button>
                    </div>
                  )}

                  {/* Step 2: Name + Phone + Next */}
                  {step === 2 && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-gray-800 text-[14px] font-medium mb-2">
                            Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={() => setNameTouched(true)}
                            placeholder="First and last name"
                            className={`w-full px-4 py-3.5 border rounded-xl text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063] transition-all ${
                              nameInvalid ? "border-red-400 bg-red-50/50" : "border-gray-300"
                            }`}
                          />
                          {nameInvalid && (
                            <p className="mt-1.5 text-red-500 text-[13px]">Please enter your name.</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-gray-800 text-[14px] font-medium mb-2">
                            Phone <span className="text-red-500">*</span>
                          </label>
                          <div
                            className={`flex rounded-xl overflow-hidden border focus-within:ring-2 focus-within:ring-[#C9A063]/30 focus-within:border-[#C9A063] transition-all ${
                              phoneInvalid ? "border-red-400 bg-red-50/50" : "border-gray-300"
                            }`}
                          >
                            <select
                              value={phoneCode}
                              onChange={(e) => setPhoneCode(e.target.value)}
                              className="px-3 py-3.5 pl-4 pr-8 bg-gray-50 border-r border-gray-300 text-[15px] text-gray-800 focus:outline-none appearance-none cursor-pointer min-w-[115px]"
                            >
                              {countryCodes.map((c) => (
                                <option key={c.code} value={c.code}>
                                  {c.code} {c.label}
                                </option>
                              ))}
                            </select>
                            <div className="relative flex-1 flex items-center">
                              <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                onBlur={() => setPhoneTouched(true)}
                                placeholder="300 1234567"
                                className="w-full px-4 py-3.5 pr-11 border-0 focus:ring-0 focus:outline-none bg-transparent text-[15px] text-gray-800 placeholder-gray-400"
                              />
                              <Phone className="absolute right-3 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={1.5} />
                            </div>
                          </div>
                          {phoneInvalid && (
                            <p className="mt-1.5 text-red-500 text-[13px]">Please enter a valid phone number.</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleBack}
                          className="inline-flex items-center gap-2 px-5 py-3 text-gray-600 font-medium rounded-xl border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleNext}
                          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#C9A063] to-[#A68B5B] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#C9A063]/30 transition-all duration-300"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: reCAPTCHA + Submit */}
                  {step === 3 && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                      <div>
                        <p className="text-gray-700 text-[14px] font-medium mb-3">
                          Verify you&apos;re not a robot
                        </p>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setRecaptchaDone((d) => !d)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setRecaptchaDone((d) => !d);
                            }
                          }}
                          className={`inline-flex items-center gap-4 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                            recaptchaDone
                              ? "border-[#C9A063]/50 bg-[#C9A063]/5"
                              : "border-gray-300 hover:border-[#C9A063]/40 hover:bg-gray-50/80"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              recaptchaDone ? "border-[#C9A063] bg-[#C9A063]" : "border-gray-400"
                            }`}
                          >
                            {recaptchaDone && (
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="text-gray-700 text-[15px] font-medium">I&apos;m not a robot</span>
                          <div className="flex items-center gap-1.5 ml-auto">
                            <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
                              <rect width="32" height="32" rx="4" fill="#1A73E8" />
                              <path d="M12 16l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                            <span className="text-[10px] text-gray-500">reCAPTCHA</span>
                          </div>
                        </div>
                        <p className="mt-2 text-[11px] text-gray-400">
                          Protected by reCAPTCHA —{" "}
                          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#1A73E8] hover:underline">Privacy</a>
                          {" · "}
                          <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-[#1A73E8] hover:underline">Terms</a>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleBack}
                          className="inline-flex items-center gap-2 px-5 py-3 text-gray-600 font-medium rounded-xl border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                          Back
                        </button>
                        {recaptchaDone ? (
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#C9A063] to-[#A68B5B] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#C9A063]/30 transition-all duration-300"
                          >
                            <Send className="w-4 h-4" strokeWidth={2.5} />
                            Submit
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
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
                Ready to book or get a quote?
              </h2>
              <p className="text-gray-600 text-[15px] sm:text-[16px] max-w-xl mx-auto mb-8">
                Skip the form and go straight to booking or request a tailored quote for your trip.
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
