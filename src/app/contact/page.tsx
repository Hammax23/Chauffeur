"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const contactCards = [
  {
    icon: Phone,
    title: "Call us",
    value: "416-893-5779",
    href: "tel:+14168935779",
    sub: "24/7 available",
  },
  {
    icon: Mail,
    title: "Email us",
    value: "reserve@sarjworldwide.com",
    href: "mailto:reserve@sarjworldwide.com",
    sub: "We respond within 24 hours",
  },
  {
    icon: MapPin,
    title: "Visit us",
    value: "231 Oak Park Blvd, Oakville, ON L6H 7S8",
    href: "https://maps.google.com/?q=231+Oak+Park+Blvd+Oakville+ON+L6H+7S8",
    sub: "By appointment",
  },
  {
    icon: Clock,
    title: "Business hours",
    value: "24/7 concierge & support",
    sub: "Bookings, changes & enquiries",
  },
];

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

// Separate component to handle search params
function ContactFormWithParams({ 
  setFullName, 
  setEmail, 
  setPhone 
}: { 
  setFullName: (v: string) => void; 
  setEmail: (v: string) => void; 
  setPhone: (v: string) => void; 
}) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const name = searchParams.get("name");
    const emailParam = searchParams.get("email");
    const phoneParam = searchParams.get("phone");
    if (name) setFullName(name);
    if (emailParam) setEmail(emailParam);
    if (phoneParam) setPhone(phoneParam);
  }, [searchParams, setFullName, setEmail, setPhone]);
  
  return null;
}

export default function ContactPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("+1");
  const [additionalNotes, setAdditionalNotes] = useState("");
  
  // Form submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          phoneCode,
          additionalNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to send message");
      }

      setSubmitSuccess(true);
      // Reset form
      setFullName("");
      setEmail("");
      setPhone("");
      setAdditionalNotes("");
    } catch (error: any) {
      setSubmitError(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Suspense fallback={null}>
        <ContactFormWithParams 
          setFullName={setFullName} 
          setEmail={setEmail} 
          setPhone={setPhone} 
        />
      </Suspense>
      <TopNav />
      <Navbar />

      {/* Hero */}
      <section className="pt-[130px] md:pt-[145px] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C9A063]/[0.03] via-transparent to-[#C9A063]/[0.05]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-[#C9A063]/20 to-transparent" />
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-12 pt-10 pb-8 sm:pt-12 sm:pb-10 md:pt-14 md:pb-12 relative z-10">
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
      <section className="pt-4 pb-10 sm:pt-6 sm:pb-14 md:pt-8 md:pb-20">
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
              {/* <div className="rounded-2xl bg-gradient-to-br from-[#C9A063]/[0.08] to-[#C9A063]/[0.04] border border-[#C9A063]/20 p-6">
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
              </div> */}
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
                        Fill in the details below—we&apos;ll get back to you shortly.
                      </p>
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="p-6 sm:p-8 space-y-5"
                >
                  {/* Success Message */}
                  {submitSuccess && (
                    <div className="flex items-start gap-4 p-5 bg-green-50 border border-green-200 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-green-800 font-semibold text-[15px] mb-1">Message Sent Successfully!</h3>
                        <p className="text-green-700 text-[14px]">Your booking form has been submitted to SARJ WORLDWIDE. We&apos;ll get back to you within 24 hours. A confirmation email has been sent to your email address.</p>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {submitError && (
                    <div className="flex items-start gap-4 p-5 bg-red-50 border border-red-200 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-red-800 font-semibold text-[15px] mb-1">Failed to Send</h3>
                        <p className="text-red-700 text-[14px]">{submitError}</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-gray-800 text-[14px] font-medium mb-2">Full name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="First and last name"
                      required
                      className="w-full px-4 py-3.5 border border-gray-300 rounded-xl text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-800 text-[14px] font-medium mb-2">Email <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="info@example.com"
                      required
                      className="w-full px-4 py-3.5 border border-gray-300 rounded-xl text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-800 text-[14px] font-medium mb-2">Phone <span className="text-red-500">*</span></label>
                    <div className="flex rounded-xl overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-[#C9A063]/30 focus-within:border-[#C9A063] transition-all">
                      <select
                        value={phoneCode}
                        onChange={(e) => setPhoneCode(e.target.value)}
                        className="px-3 py-3.5 pl-4 pr-8 bg-gray-50 border-r border-gray-300 text-[15px] text-gray-800 focus:outline-none appearance-none cursor-pointer min-w-[115px]"
                      >
                        {countryCodes.map((c) => (
                          <option key={`${c.code}-${c.label}`} value={c.code}>
                            {c.code} {c.label}
                          </option>
                        ))}
                      </select>
                      <div className="relative flex-1 flex items-center">
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="300 1234567"
                          required
                          className="w-full px-4 py-3.5 pr-11 border-0 focus:ring-0 focus:outline-none bg-transparent text-[15px] text-gray-800 placeholder-gray-400"
                        />
                        <Phone className="absolute right-3 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={1.5} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-800 text-[14px] font-medium mb-2">Additional notes</label>
                    <textarea
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder="Special requests, questions, or additional information..."
                      rows={4}
                      className="w-full px-4 py-3.5 border border-gray-300 rounded-xl text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063] transition-all resize-y"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#C9A063] to-[#A68B5B] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#C9A063]/30 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" strokeWidth={2.5} />
                        Send message
                      </>
                    )}
                  </button>
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
                  href="/reservation"
                  className="group inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full bg-[#C9A063] text-white font-semibold shadow-sm hover:bg-[#B8935A] active:scale-[0.98] transition-all duration-200"
                >
                  Book a ride
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" strokeWidth={2} />
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
