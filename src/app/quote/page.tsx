"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, Users, Phone, Mail, Clock, MapPin, ChevronDown, Plus } from "lucide-react";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { services } from "@/data/services";
import { fleetData } from "@/data/fleet";

// Country codes: Canada first. flagCode = ISO code for flag image (flagcdn.com).
const COUNTRY_CODES = [
  { code: "+1", label: "CA", name: "Canada", flagCode: "ca" },
  { code: "+1", label: "US", name: "United States", flagCode: "us" },
  { code: "+44", label: "UK", name: "United Kingdom", flagCode: "gb" },
  { code: "+33", label: "FR", name: "France", flagCode: "fr" },
  { code: "+49", label: "DE", name: "Germany", flagCode: "de" },
  { code: "+39", label: "IT", name: "Italy", flagCode: "it" },
  { code: "+34", label: "ES", name: "Spain", flagCode: "es" },
  { code: "+31", label: "NL", name: "Netherlands", flagCode: "nl" },
  { code: "+41", label: "CH", name: "Switzerland", flagCode: "ch" },
  { code: "+32", label: "BE", name: "Belgium", flagCode: "be" },
  { code: "+43", label: "AT", name: "Austria", flagCode: "at" },
  { code: "+353", label: "IE", name: "Ireland", flagCode: "ie" },
];

const FLAG_CDN = "https://flagcdn.com";

export default function QuotePage() {
  const [stops, setStops] = useState<string[]>([]);
  const [agree, setAgree] = useState(false);
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0].code);
  const [countryLabel, setCountryLabel] = useState(COUNTRY_CODES[0].label);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode && c.label === countryLabel) ?? COUNTRY_CODES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setCountryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addStop = () => setStops((s) => [...s, ""]);
  const updateStop = (i: number, v: string) =>
    setStops((s) => s.map((x, j) => (j === i ? v : x)));
  const removeStop = (i: number) => setStops((s) => s.filter((_, j) => j !== i));

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <TopNav />
      <Navbar />

      <section className="pt-[130px] md:pt-[145px] py-12 sm:py-16 md:py-20">
        <div className="max-w-[720px] mx-auto px-6 sm:px-8 md:px-12">
          <div className="mb-8 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-2">
              ONLINE QUOTE
            </h1>
            <p className="text-[#C9A063] text-[14px] sm:text-[15px] font-semibold tracking-wide uppercase">
              REQUEST A QUOTE
            </p>
          </div>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="rounded-2xl bg-white border border-gray-200 shadow-lg shadow-gray-200/50 p-6 sm:p-8 md:p-10 space-y-6"
          >
            {/* Row 1: Passenger Name | Passengers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-gray-800 text-[14px] font-medium mb-2">
                  Passenger Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="First and Last name"
                    className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-xl text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063] transition-all"
                  />
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={1.5} />
                </div>
              </div>
              <div>
                <label className="block text-gray-800 text-[14px] font-medium mb-2">
                  Passengers
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="# of passengers"
                    className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-xl text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063] transition-all"
                  />
                  <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            {/* Row 2: Phone | Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-gray-800 text-[14px] font-medium mb-2">Phone</label>
                <div className="flex rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#C9A063]/30 focus-within:border-[#C9A063] transition-all">
                  <div className="relative flex-shrink-0 w-[100px] rounded-l-xl overflow-visible" ref={countryDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setCountryDropdownOpen((o) => !o)}
                      className="w-full flex items-center justify-center gap-1 px-2 py-3 bg-gray-50 border-r border-gray-300 text-[13px] text-gray-800 font-medium focus:outline-none cursor-pointer hover:bg-gray-100/80 transition-colors"
                      aria-haspopup="listbox"
                      aria-expanded={countryDropdownOpen}
                      aria-label="Country code"
                    >
                      <img
                        src={`${FLAG_CDN}/w40/${selectedCountry.flagCode}.png`}
                        alt=""
                        width={20}
                        height={15}
                        className="w-5 h-[15px] object-cover rounded-sm shrink-0"
                      />
                      <span className="whitespace-nowrap">{selectedCountry.code} {selectedCountry.label}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform ${countryDropdownOpen ? "rotate-180" : ""}`} strokeWidth={2.5} />
                    </button>
                    {countryDropdownOpen && (
                      <ul
                        role="listbox"
                        className="absolute left-0 top-full z-[100] mt-1 w-[180px] max-h-[240px] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl py-1"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <li key={`${c.code}-${c.label}`} role="option" aria-selected={c.label === selectedCountry.label && c.code === selectedCountry.code}>
                            <button
                              type="button"
                              onClick={() => {
                                setCountryCode(c.code);
                                setCountryLabel(c.label);
                                setCountryDropdownOpen(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] text-gray-800 hover:bg-[#C9A063]/10 focus:bg-[#C9A063]/10 focus:outline-none"
                            >
                              <img
                                src={`${FLAG_CDN}/w40/${c.flagCode}.png`}
                                alt=""
                                width={20}
                                height={15}
                                className="w-5 h-[15px] object-cover rounded-sm shrink-0"
                              />
                              <span>{c.code} {c.label}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="relative flex-1 flex items-center min-w-0 rounded-r-xl overflow-hidden">
                    <input
                      type="tel"
                      placeholder={countryLabel === "CA" || countryLabel === "US" ? "e.g. 416-555-1234" : "Phone number"}
                      maxLength={18}
                      inputMode="tel"
                      className="w-full px-4 py-3 pr-11 border-0 focus:ring-0 focus:outline-none text-[15px] text-gray-800 placeholder-gray-400"
                    />
                    <Phone className="absolute right-3 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={1.5} />
                  </div>
                </div>
                <p className="mt-1 text-gray-500 text-[12px]">Canada, US, UK & Europe supported</p>
              </div>
              <div>
                <label className="block text-gray-800 text-[14px] font-medium mb-2">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-xl text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063] transition-all"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            {/* Row 3: Service Type | Vehicle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-gray-800 text-[14px] font-medium mb-2">
                  Service Type
                </label>
                <div className="relative">
                  <select className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-xl text-[15px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063] appearance-none cursor-pointer bg-white">
                    <option value="">Select service type</option>
                    {services.map((s) => (
                      <option key={s.slug} value={s.slug}>{s.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={2} />
                </div>
              </div>
              <div>
                <label className="block text-gray-800 text-[14px] font-medium mb-2">Vehicle</label>
                <div className="relative">
                  <select className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-xl text-[15px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063] appearance-none cursor-pointer bg-white">
                    <option value="">Select vehicle</option>
                    {fleetData.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={2} />
                </div>
              </div>
            </div>

            {/* Row 4: Pick-up time */}
            <div>
              <label className="block text-gray-800 text-[14px] font-medium mb-2">
                Pick-up time
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-xl text-[15px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063] transition-all"
                />
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={1.5} />
              </div>
            </div>

            {/* Row 5: Pick-up location + Add Stop */}
            <div>
              <label className="block text-gray-800 text-[14px] font-medium mb-2">
                Pick-up location
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Pick-up location"
                    className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-xl text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063] transition-all"
                  />
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={1.5} />
                </div>
                <button
                  type="button"
                  onClick={addStop}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 border-2 border-[#C9A063] text-[#C9A063] font-semibold rounded-xl hover:bg-[#C9A063]/10 transition-all whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  Add Stop
                </button>
              </div>
            </div>

            {/* Dynamic stops */}
            {stops.map((stop, i) => (
              <div key={i}>
                <label className="block text-gray-800 text-[14px] font-medium mb-2">
                  Stop {i + 1}
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Stop location"
                      value={stop}
                      onChange={(e) => updateStop(i, e.target.value)}
                      className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-xl text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063] transition-all"
                    />
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={1.5} />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStop(i)}
                    className="px-4 py-3 text-gray-500 hover:text-red-600 font-medium rounded-xl border border-gray-300 hover:border-red-300 transition-all"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {/* Row 6: Drop-off location */}
            <div>
              <label className="block text-gray-800 text-[14px] font-medium mb-2">
                Drop-off location
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Drop-off location"
                  className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-xl text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063] transition-all"
                />
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={1.5} />
              </div>
            </div>

            {/* Row 7: Notes */}
            <div>
              <label className="block text-gray-800 text-[14px] font-medium mb-2">Notes:</label>
              <textarea
                placeholder="Additional Notes"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/30 focus:border-[#C9A063] transition-all resize-y min-h-[100px]"
              />
            </div>

            {/* Checkbox + Submit */}
            <div className="pt-4 space-y-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-[#C9A063] focus:ring-[#C9A063]"
                />
                <span className="text-gray-700 text-[14px] sm:text-[15px]">
                  I agree to receive email and SMS communication regarding my quote request.
                </span>
              </label>
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 bg-gradient-to-r from-[#C9A063] to-[#A68B5B] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#C9A063]/30 transition-all duration-300"
              >
                Get My Quote
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-gray-500 text-[14px]">
            Prefer to book directly?{" "}
            <Link href="/#book" className="text-[#C9A063] font-medium hover:underline">
              Go to booking
            </Link>
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
