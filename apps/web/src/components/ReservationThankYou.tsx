"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const THANK_YOU_STORAGE_KEY = "sarj:reservation-thank-you";

export type ThankYouProps = {
  firstName: string;
  email: string;
  bookingId: string;
  serviceLabel: string;
  isHourly: boolean;
  hourlyDuration?: number;
  dateTimeLabel: string;
  pickup: string;
  dropoff: string;
  vehicleName: string;
  passengers: number;
  totalLabel: string;
  paymentMethod: "card" | "cash";
  emailSending: boolean;
  emailSent: boolean;
  emailError: string;
};

const GOLD = "bg-gradient-to-br from-[#C9A063] to-[#B8935A]";

const NEXT_STEPS = [
  { title: "Confirmation email", body: "Your booking details and receipt are on their way to your inbox." },
  { title: "We assign your chauffeur", body: "Our team prepares your vehicle and sends chauffeur details before pickup." },
  { title: "Ride with confidence", body: "Your chauffeur arrives on time and handles everything from there." },
];

/** Full-page thank-you shown after a reservation is submitted successfully. */
export default function ReservationThankYou(p: ThankYouProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const rows = [
    { icon: Calendar, label: "Date & time", value: p.dateTimeLabel || "—" },
    { icon: MapPin, label: "Pickup", value: p.pickup || "—" },
    ...(p.isHourly
      ? [{ icon: Navigation, label: "Service", value: `Hourly chauffeur${p.hourlyDuration ? ` · ${p.hourlyDuration} hours` : ""}` }]
      : [{ icon: Navigation, label: "Drop-off", value: p.dropoff || "—" }]),
    { icon: Car, label: "Vehicle", value: p.vehicleName || "—" },
    { icon: Users, label: "Passengers", value: String(p.passengers) },
    {
      icon: p.paymentMethod === "card" ? CreditCard : Wallet,
      label: p.paymentMethod === "card" ? "Paid by card" : "Pay on delivery",
      value: p.totalLabel,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f5f5f7]">
      <TopNav />
      <Navbar />

      <style>{`
        @keyframes ty-pop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); } }
        @keyframes ty-ring { 0% { transform: scale(0.8); opacity: 0.7; } 100% { transform: scale(1.9); opacity: 0; } }
        @keyframes ty-rise { from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .ty-pop { animation: ty-pop 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.2) both; }
        .ty-ring { animation: ty-ring 1.6s ease-out 0.5s 2 both; }
        .ty-rise { animation: ty-rise 0.6s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .ty-pop, .ty-ring, .ty-rise { animation: none; } }
      `}</style>

      {/* Hero band */}
      <section className="relative overflow-hidden bg-[#0a0a0a] pb-28 pt-[150px] text-center sm:pt-[170px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,rgba(201,160,99,0.22),transparent_70%)]" />
        <div className="relative mx-auto max-w-[760px] px-6">
          <div className="relative mx-auto mb-7 flex h-20 w-20 items-center justify-center">
            <span className={`ty-ring absolute inset-0 rounded-full ${GOLD} opacity-0`} />
            <span className={`ty-pop relative flex h-20 w-20 items-center justify-center rounded-full ${GOLD} shadow-xl shadow-[#C9A063]/30`}>
              <Check className="h-10 w-10 text-black" strokeWidth={3} />
            </span>
          </div>

          <p className="ty-rise text-xs font-bold uppercase tracking-[0.28em] text-[#C9A063]" style={{ animationDelay: "0.15s" }}>
            Reservation confirmed
          </p>
          <h1 className="ty-rise mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl" style={{ animationDelay: "0.25s", textWrap: "balance" }}>
            Thank you{p.firstName ? `, ${p.firstName}` : ""}!
          </h1>
          <p className="ty-rise mx-auto mt-5 max-w-[560px] text-base font-light leading-7 text-white/70 sm:text-lg" style={{ animationDelay: "0.35s" }}>
            Your ride with SARJ Worldwide is booked. We look forward to taking care of your journey.
          </p>

          {p.bookingId && (
            <div className="ty-rise mt-8 inline-flex flex-col items-center rounded-2xl border border-[#C9A063]/40 bg-white/[0.05] px-8 py-4 backdrop-blur" style={{ animationDelay: "0.45s" }}>
              <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/50">Booking reference</span>
              <span className="mt-1 font-mono text-xl font-bold tracking-wider text-[#C9A063] sm:text-2xl">{p.bookingId}</span>
            </div>
          )}
        </div>
      </section>

      {/* Summary card overlapping the hero */}
      <section className="relative z-10 mx-auto -mt-16 max-w-[900px] px-4 pb-16 sm:px-6">
        <div className="ty-rise overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)]" style={{ animationDelay: "0.5s" }}>
          {/* Email status */}
          <div className="flex items-center justify-center gap-2.5 border-b border-gray-100 bg-[#fafafa] px-6 py-4 text-center text-sm">
            {p.emailSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#C9A063]" />
                <span className="text-gray-600">Sending your confirmation email…</span>
              </>
            ) : p.emailError ? (
              <>
                <Mail className="h-4 w-4 text-red-500 shrink-0" />
                <span className="text-red-600 text-left">
                  We couldn&apos;t finish email delivery for this booking. Your payment and booking details are shown above — please keep your reference.
                  <span className="mt-1 block text-xs text-red-500/90 font-mono break-words">
                    {p.emailError}
                  </span>
                </span>
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 text-emerald-600" />
                <span className="text-gray-700">
                  {p.emailSent ? "Confirmation sent to " : "Confirmation will be sent to "}
                  <strong className="font-semibold text-gray-950">{p.email}</strong>
                </span>
              </>
            )}
          </div>

          {/* Trip summary */}
          <div className="p-6 sm:p-9">
            <h2 className="text-center text-lg font-bold text-gray-950">Your trip</h2>
            <p className="mt-1 text-center text-sm text-gray-500">{p.serviceLabel}</p>

            <dl className="mt-7 grid gap-3.5 sm:grid-cols-2">
              {rows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3.5 rounded-2xl border border-gray-100 bg-[#fafafa] p-4">
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${GOLD} text-black`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-semibold leading-snug text-gray-950">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          {/* What happens next */}
          <div className="border-t border-gray-100 bg-[#fafafa] p-6 sm:p-9">
            <h2 className="text-center text-lg font-bold text-gray-950">What happens next</h2>
            <ol className="mt-7 grid gap-6 sm:grid-cols-3">
              {NEXT_STEPS.map((s, i) => (
                <li key={s.title} className="text-center">
                  <span className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${GOLD} text-[13px] font-bold text-black shadow-md shadow-[#C9A063]/25`}>
                    0{i + 1}
                  </span>
                  <h3 className="mt-3 text-sm font-bold text-gray-950">{s.title}</h3>
                  <p className="mx-auto mt-1.5 max-w-[230px] text-[13px] font-light leading-6 text-gray-600">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-center gap-3 border-t border-gray-100 p-6 sm:flex-row sm:justify-center sm:p-9">
            {p.bookingId && (
              <Link
                href={`/track/${encodeURIComponent(p.bookingId)}`}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-full ${GOLD} px-8 py-3.5 text-[13px] font-semibold text-black shadow-md shadow-[#C9A063]/25 transition hover:shadow-lg hover:shadow-[#C9A063]/40 sm:w-auto`}
              >
                Track your ride
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            )}
            {/* Full navigation so the booking form starts fresh */}
            <a
              href="/reservation"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 px-8 py-3.5 text-[13px] font-semibold text-gray-900 transition hover:border-black hover:bg-black hover:text-white sm:w-auto"
            >
              Book another ride
            </a>
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-[13px] font-semibold text-gray-600 transition hover:text-[#B8935A] sm:w-auto"
            >
              Back to home
            </Link>
          </div>
        </div>

        {/* Help */}
        <div className="mt-7 flex flex-col items-center justify-center gap-2 text-center text-sm text-gray-500 sm:flex-row sm:gap-5">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#C9A063]" />
            Need to change something?
          </span>
          <a href="tel:+14168935779" className="inline-flex items-center gap-2 font-semibold text-gray-900 transition hover:text-[#B8935A]">
            <Phone className="h-4 w-4 text-[#C9A063]" />
            +1 (416) 893-5779
          </a>
          <span className="inline-flex items-center gap-1.5 text-gray-400">
            <CheckCircle2 className="h-4 w-4" />
            24/7 support
          </span>
        </div>
      </section>

      <Footer />
    </main>
  );
}
